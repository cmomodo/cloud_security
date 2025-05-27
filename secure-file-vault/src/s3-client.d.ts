import { S3Client } from '@aws-sdk/client-s3';
export declare function getAuthenticatedS3Client(): Promise<S3Client>;
export declare function uploadFile(file: File, key: string, bucketName: string): Promise<string>;
export declare function getSignedDownloadUrl(key: string, bucketName: string, expiresIn?: number): Promise<string>;
export declare function listFiles(prefix: string, bucketName: string): Promise<import("@aws-sdk/client-s3")._Object[]>;
export declare function deleteFile(key: string, bucketName: string): Promise<boolean>;
