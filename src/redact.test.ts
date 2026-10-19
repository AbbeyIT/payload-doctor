import assert from "node:assert/strict";
import { createRedactor } from "./redact.js";

const r = createRedactor();

const json = r.apply('{"email":"ana@client.com","password":"hunter2","note":"ana@client.com again"}');
assert.ok(!json.includes("ana@client.com"), "email leaked");
assert.ok(!json.includes("hunter2"), "password leaked");
assert.equal(json.match(/\[EMAIL_1\]/g)?.length, 2, "same email should reuse placeholder");

const header = r.apply("Authorization: Bearer abcdef1234567890XYZ");
assert.ok(!header.includes("abcdef1234567890XYZ"), "bearer token leaked");

const xml = r.apply("<token>s3cr3t-value</token><orderNo>1001</orderNo>");
assert.ok(!xml.includes("s3cr3t-value"), "xml token leaked");
assert.ok(xml.includes("<orderNo>1001</orderNo>"), "normal fields must stay intact");

const ip = r.apply("from 10.20.30.40");
assert.ok(!ip.includes("10.20.30.40"), "ip leaked");

console.log("redact tests passed", r.counts());
