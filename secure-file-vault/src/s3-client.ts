// S3 client integration using direct Cognito Auth credentials

import { getCurrentCredentials } from './cognito-client';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Function to get authenticated S3 client
export async function getAuthenticatedS3Client(): Promise<S3Client> {
  try {
    const session = await getCurrentCredentials();
    if (!session?.credentials) {
      throw new Error('No credentials available. Please login first.');
    }

    return new S3Client({
      region: process.env.REGION || 'us-east-1',
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
  } catch (error) {
    console.error('Error getting authenticated S3 client:', error);
    throw error;
  }
}

// Upload file to S3
export async function uploadFile(file: File, key: string, bucketName: string): Promise<string> {
  try {
    const s3Client = await getAuthenticatedS3Client();
    const arrayBuffer = await file.arrayBuffer();
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type,
    });
    
    await s3Client.send(command);
    return key;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// Generate a pre-signed URL for downloading a file
export async function getSignedDownloadUrl(key: string, bucketName: string, expiresIn = 3600): Promise<string> {
  try {
    const s3Client = await getAuthenticatedS3Client();
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
}

// List files in a folder
export async function listFiles(prefix: string, bucketName: string) {
  try {
    const s3Client = await getAuthenticatedS3Client();
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });
    
    const response = await s3Client.send(command);
    return response.Contents || [];
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

// Delete a file
export async function deleteFile(key: string, bucketName: string) {
  try {
    const s3Client = await getAuthenticatedS3Client();
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}