import { db } from "@/infra/db";
import { schema } from "@/infra/db/schemas";
import { type Either, makeRight } from "@/shared/either";
import { z } from "zod";
import { asc, desc, ilike, count } from "drizzle-orm";


const getUploadsInput = z.object({
    searchQuery: z.string().optional(),
    sortBy: z.enum(['createdAt']).optional(),
    sortDirection: z.enum(['asc', 'desc']).optional(),
    page: z.number().optional().default(1),
    pageSize: z.number().optional().default(20),
})

type GetUploadsInput = z.input<typeof getUploadsInput>;

type GetUploadsOutput = {
    uploads: {
        id: string,
        name: string,
        createdAt: Date,
        remoteKey: string,
        remoteUrl: string,
    }[]
    total: number
}

export async function getUploads(input: GetUploadsInput): Promise<Either<never, GetUploadsOutput>> {
    const { searchQuery, sortDirection, sortBy, page, pageSize } = getUploadsInput.parse(input);

    const [uploads, [{total}]] = await Promise.all([ 
        db
    .select(
        {
            id: schema.uploads.id,
            name: schema.uploads.name,
            createdAt: schema.uploads.createdAt,
            remoteKey: schema.uploads.remoteKey,
            remoteUrl: schema.uploads.remoteUrl,
        }
    )
    .from(schema.uploads)
    .where(searchQuery ? ilike(schema.uploads.name, `%${searchQuery}%`) : undefined)
    .orderBy(fields => {
        if (sortBy && sortDirection === 'asc') {
            return asc(fields[sortBy])
        }
        if (sortBy && sortDirection === 'desc') {
            return desc(fields[sortBy])
        }
        return desc(fields.id)
    })
    .offset((page - 1) * pageSize)
    .limit(pageSize),
   
    db
    .select({total: count(schema.uploads.id)})
    .from(schema.uploads)
    .where(searchQuery ? ilike(schema.uploads.name, `%${searchQuery}%`) : undefined)
    ])

    return makeRight({uploads, total})
}