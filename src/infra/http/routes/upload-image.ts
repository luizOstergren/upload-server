import { uploadImage } from "@/app/functions/upload-image";
import { isRight, unwrapEither } from "@/shared/either";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

export const uploadImageRoute: FastifyPluginAsyncZod = async server => {
    server.post('/uploads', {
        schema: {
            summary: 'Upload an image',
            tags: ['uploads'],
            consumes: ['multipart/form-data'],
            description: 'Upload an image to the server',
            response: {
                    201: z.null().describe('Upload success'),
                    400: z
                    .object({ message: z.string()}),
                    409: z
                    .object({ message: z.string()})
                    .describe('Conflict error'),
            },
        },
    }, 
    async (request, reply) => {
        const uploadFile = await request.file({
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
            },
        });


        if (!uploadFile) {
            return reply.status(400).send({
                message: 'File not found',
            });
        }

        const result = await uploadImage({
            fileName: uploadFile.filename,
            contentType: uploadFile.mimetype,
            contentStream: uploadFile.file,
        })

        if(uploadFile.file.truncated) {
            return reply.status(400).send({ 
                message: 'File size limit reached',
            })
        }

        if(isRight(result)) {
            console.log(unwrapEither(result))

        return reply.status(201).send()
    }
    const error = unwrapEither(result)

    switch(error.constructor.name) {
        case 'InvalidFileFormat':
            return reply.status(400).send({
                message: error.message, 
            })
        }
}
)
}