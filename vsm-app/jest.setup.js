// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import 'isomorphic-fetch'
import Logger from './helpers/server/logger';
import * as dotenv from 'dotenv';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
// TODO: structuredClone not available yet for jest
global.structuredClone = (val) => JSON.parse(JSON.stringify(val))
Logger.initLogger();
dotenv.config({ path: './.env.local.example' });