import { uploadImage } from "./upload-image";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { isLeft, isRight, unwrapEither } from "@/shared/either";
import { db } from "@/infra/db";
import { schema } from "@/infra/db/schemas";
import { vi, beforeAll, it, describe, expect } from "vitest";
import { InvalidFileFormat } from "./erros/invalid-file-format";

describe('upload image', () => {
    beforeAll(() => {
        vi.mock('@/infra/storage/upload-file-to-storage', () => {
            return {
                uploadFileToStorage: vi.fn().mockImplementation(() => {
                    return {
                        key: `${randomUUID()}.jpg`,
                        url: 'http://storage.com/image.jpg',
                    }
                }),
            }
        })
})


it('should be able to upload an image', async () => {
    const fileName = `${randomUUID()}.jpg`

    const sut = await uploadImage({
        fileName,
        contentType: 'image/jpg',
        contentStream: Readable.from([]),
    })

    expect(isRight(sut)).toBe(true)

    const result = await db.select().from(schema.uploads).where(eq(schema.uploads.name, fileName))

    expect(result).toHaveLength(1)

    })

    it('should not be able to upload an invalid file', async () => {
    const fileName = `${randomUUID()}.pdf`

    const sut = await uploadImage({
        fileName,
        contentType: 'image/pdf',
        contentStream: Readable.from([]),
    })

    expect(isLeft(sut)).toBe(true)
    expect(unwrapEither(sut)).toBeInstanceOf(InvalidFileFormat)
    
    })
})