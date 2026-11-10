import {test} from 'node:test';
import assert from 'node:assert/strict';
import {unwrapOfflinePresentation} from '../src/offlinePresentation.mjs';

test('offline approved wrapper reveals internal slides without executing scripts',()=>{
 const original='<!DOCTYPE html><html><body><section class="slide">Mateus 4:1–11</section></body></html>';
 const wrapper='<script>const SOURCE_B64="'+Buffer.from(original).toString('base64')+'";</script>';
 assert.equal(unwrapOfflinePresentation(wrapper),original);
 assert.equal(unwrapOfflinePresentation(original),original);
});
test('invalid or oversized embedded sources are ignored safely',()=>{
 const wrapper='<script>const SOURCE_B64="%%%%";</script>';
 assert.equal(unwrapOfflinePresentation(wrapper),wrapper);
 assert.equal(unwrapOfflinePresentation('x'.repeat(16_000_001)).length,16_000_001);
});
