import { S3Client } from "@aws-sdk/client-s3"
import { Mode } from "../types";


/**
 * Uploads data to make it available to the Hadoop map-reduce pipeline
 */
export class Uploader {
    private mode: Mode
    private s3Client?: S3Client


    constructor(mode: Mode, region: string) {
        this.mode = mode
        if (this.mode == Mode.EMR) {
            this.s3Client = new S3Client({ region })
        } else if (this.mode == Mode.LOCAL) {
            // do something
        }
    }

    public async upload(data: any): Promise<void> {
        return this.mode == Mode.LOCAL ? this._uploadToLocalHadoop(data) : this._uploadToS3(data)
    }

    private async _uploadToLocalHadoop(data: any): Promise<void> {
        data
        return
    }

    // https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance-guidelines.html
    private async _uploadToS3(data: any): Promise<void> {
        // probably a good idea to use Multipart Upload
        this.s3Client
        data
        return
    }
}
