export interface SecurityScoutRecord {
  id: string;                      // Partition key
  timestamp: number;              // Sort key
  securityStatus?: string;        // Indexed by GSI
  expiresAt?: number;             // TTL attribute (epoch time)
  region?: string;                // Optional: AWS region where scan happened
  resourceType?: string;          // Optional: e.g., S3, RDS, EC2
  issueType?: string;             // Optional: Type of security finding
  description?: string;           // Optional: Finding summary
}
