import { Injectable } from "@nestjs/common";

export interface DeviceInfo {
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
}

/**
 * Module 004 — minimal, dependency-free User-Agent parser used to enrich
 * `Session` rows for the admin "Session Details"/"Device Management" views
 * (Domain 3). Deliberately NOT a full UA-parsing library (no new npm
 * dependency was warranted for a best-effort display field) — this covers
 * the common browsers/operating systems well enough for an admin UI and
 * degrades to "Unknown" rather than throwing on anything it doesn't
 * recognize.
 */
@Injectable()
export class DeviceInfoService {
  parse(userAgent: string | null | undefined): DeviceInfo {
    if (!userAgent) {
      return { browser: "Unknown", os: "Unknown", deviceType: "unknown" };
    }
    const ua = userAgent;

    let browser = "Unknown";
    if (/Edg\//.test(ua)) browser = "Edge";
    else if (/OPR\//.test(ua)) browser = "Opera";
    else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
    else if (/Firefox\//.test(ua)) browser = "Firefox";
    else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = "Safari";
    else if (/MSIE|Trident\//.test(ua)) browser = "Internet Explorer";

    let os = "Unknown";
    if (/Windows NT/.test(ua)) os = "Windows";
    else if (/Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua)) os = "macOS";
    else if (/Android/.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
    else if (/Linux/.test(ua)) os = "Linux";

    let deviceType: DeviceInfo["deviceType"] = "desktop";
    if (/iPad|Tablet/.test(ua)) deviceType = "tablet";
    else if (/Mobi|iPhone|Android/.test(ua)) deviceType = "mobile";

    return { browser, os, deviceType };
  }
}
