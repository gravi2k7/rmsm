import { createHash, createHmac } from "crypto";

/**
 * AWS Signature Version 4, implemented directly per AWS's public spec —
 * used by both SesEmailProvider and AwsSnsProvider so neither needs the
 * AWS SDK, consistent with this project's "no vendor SDK" rule applied to
 * every provider integration since Module 002's OAuth adapters.
 */

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function currentAmzTimestamp(): { amzDate: string; dateStamp: string } {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  return { amzDate, dateStamp };
}

export interface SignedRequestHeaders {
  Authorization: string;
  "X-Amz-Date": string;
  Host: string;
}

/**
 * Signs a request for a form-urlencoded POST body (SES's `Action=SendEmail...`
 * query-style API and SNS's `Action=Publish...` API both use this shape) —
 * the two AWS services this module integrates with, not a general-purpose
 * SigV4 client for every AWS API.
 */
export function signAwsRequest(
  credentials: AwsCredentials,
  service: "ses" | "sns",
  host: string,
  body: string,
): SignedRequestHeaders {
  const { amzDate, dateStamp } = currentAmzTimestamp();
  const canonicalUri = "/";
  const canonicalQuerystring = "";
  const payloadHash = sha256Hex(body);
  const canonicalHeaders = `content-type:application/x-www-form-urlencoded\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const canonicalRequest = [
    "POST",
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${credentials.region}/${service}/aws4_request`;
  const stringToSign = [algorithm, amzDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");

  const kDate = hmac(`AWS4${credentials.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, credentials.region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmac(kSigning, stringToSign).toString("hex");

  const authorizationHeader = `${algorithm} Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { Authorization: authorizationHeader, "X-Amz-Date": amzDate, Host: host };
}
