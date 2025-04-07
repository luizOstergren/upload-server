import { db, pg } from "@/infra/db";
import { schema } from "@/infra/db/schemas";
import { type Either, makeRight } from "@/shared/either";
import { z } from "zod";
import { asc, desc, ilike, count } from "drizzle-orm";
import { stringify } from "csv-stringify";
import { pipeline } from "stream/promises";
import { PassThrough, Transform } from "stream";
import { uploadFileToStorage } from "@/infra/storage/upload-file-to-storage";
import { date } from "drizzle-orm/mysql-core";


const exportUploadsInput = z.object({
    searchQuery: z.string().optional(),
})

type ExportUploadsInput = z.input<typeof exportUploadsInput>;

type ExportUploadsOutput = {
    reportUrl: string,
}

export async function exportUploads(input: ExportUploadsInput): Promise<Either<never, ExportUploadsOutput>> {
    const { searchQuery } = exportUploadsInput.parse(input);

    const { sql, params } = db
    .select(
        {
            id: schema.uploads.id,
            name: schema.uploads.name,
            createdAt: schema.uploads.createdAt,
            // remoteKey: schema.uploads.remoteKey,
            remoteUrl: schema.uploads.remoteUrl,
        }
    )
    .from(schema.uploads)
    .where(searchQuery ? ilike(schema.uploads.name, `%${searchQuery}%`) : undefined).toSQL()

    const cursor = pg.unsafe(sql, params as string[]).cursor(2)

    // for await (const row of cursor) {
    //     console.log(row)
    // }

    const csv = stringify({
        delimiter: ',',
        header: true,
        columns: [
            {key: 'id', header: 'ID'},
            {key: 'name', header: 'Name'},
            {key: 'remote_url', header: 'URL'},
            {key: 'created_at', header: 'Uploaded at'},
        ],
    })

    const uploadToStoregeStream = new PassThrough()

    const convertToCSVPipeline = pipeline(
        cursor,
        new Transform({
            objectMode: true,
            transform(chuncks: unknown[], encoding, callback) {
                for (const chunk of chuncks) {
                    this.push(chunk)
                }
                callback()
            }
        }),
        csv,
        uploadToStoregeStream,
    )

    const uploadToStorage = uploadFileToStorage({
        fileName: `${new Date().toISOString()}-uploads.csv`,
        folder: 'downloads',
        contentType: 'text/csv',
        contentStream: uploadToStoregeStream,
    })

    const [{url}] = await Promise.all([
        uploadToStorage,
        convertToCSVPipeline,
    ])

    console.log(url)

    return makeRight({reportUrl: url})
}