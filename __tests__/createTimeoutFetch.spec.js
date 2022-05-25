/*
 * Copyright 2020 American Express Travel Related Services Company, Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import AbortController from 'abort-controller';
import createTimeoutFetch from '../src/createTimeoutFetch';
import TimeoutError from '../src/TimeoutError';

function resolveInMs(ms) {
  return new Promise((resolve) => {
    setTimeout(() => resolve('Fetch Resolved'), ms);
  });
}

const handleSignal = (signal) => new Promise((_, rej) => {
  signal.addEventListener('abort', () => {
    const abortError = new Error(`aborted: ${signal.aborted}`);
    abortError.name = 'AbortError';
    rej(abortError);
  });
});

jest.useFakeTimers();

describe('createTimeoutFetch', () => {
  it('should reject if the response takes longer than the given default', async () => {
    const mockFetch = jest.fn(() => resolveInMs(3000));
    const enhancedFetch = createTimeoutFetch(1000)(mockFetch);
    const promise = enhancedFetch('/test');
    // added buffer of about 500, because the promises can
    // resolve/reject a little after the fake timers.
    jest.advanceTimersByTime(1500);
    await expect(promise).rejects.toEqual(new TimeoutError('/test after 1000ms'));
  });

  it('should reject if the response takes longer than custom timeout that is longer than the default', async () => {
    const mockFetch = jest.fn(() => resolveInMs(6000));
    const enhancedFetch = createTimeoutFetch(4000)(mockFetch);
    const promise = enhancedFetch('/test', { timeout: 5000 });
    jest.advanceTimersByTime(5500);
    await expect(promise).rejects.toEqual(new TimeoutError('/test after 5000ms'));
  });

  it('should reject if the response takes longer than custom timeout that is shorter than the default', async () => {
    const mockFetch = jest.fn(() => resolveInMs(4000));
    const enhancedFetch = createTimeoutFetch(3000)(mockFetch);
    const promise = enhancedFetch('/test', { timeout: 2000 });
    jest.advanceTimersByTime(2500);
    await expect(promise).rejects.toEqual(new TimeoutError('/test after 2000ms'));
  });

  it('should resolve if the response finishes before the default timeout', async () => {
    const mockFetch = jest.fn(() => resolveInMs(1000));
    const enhancedFetch = createTimeoutFetch(3000)(mockFetch);
    const promise = enhancedFetch('/test');
    jest.advanceTimersByTime(1500);
    await expect(promise).resolves.toBe('Fetch Resolved');
  });

  it('should resolve if the response finishes before the custom timeout that is longer than the default', async () => {
    const mockFetch = jest.fn(() => resolveInMs(2000));
    const enhancedFetch = createTimeoutFetch(1000)(mockFetch);
    const promise = enhancedFetch('/test', { timeout: 3000 });
    jest.advanceTimersByTime(2500);
    await expect(promise).resolves.toBe('Fetch Resolved');
  });

  it('should resolve if the response finishes before the custom timeout that is shorter than the default', async () => {
    const mockFetch = jest.fn(() => resolveInMs(1000));
    const enhancedFetch = createTimeoutFetch(3000)(mockFetch);
    const promise = enhancedFetch('/test', { timeout: 2000 });
    jest.advanceTimersByTime(1500);
    await expect(promise).resolves.toBe('Fetch Resolved');
  });

  it('does not suppress fetch errors', async () => {
    const mockFetch = async () => {
      throw new Error('bad stuff');
    };

    const enhancedFetch = createTimeoutFetch(2000)(mockFetch);
    const promise = enhancedFetch('/test');
    await expect(promise).rejects.toEqual(new Error('bad stuff'));
  });

  it('handles abort error triggered by timeout', async () => {
    const mockFetch = jest.fn((path, { signal }) => handleSignal(signal));

    const enhancedFetch = createTimeoutFetch(1000)(mockFetch);
    const promise = enhancedFetch('/test');
    jest.runAllTimers();
    await expect(promise).rejects.toEqual(new TimeoutError('/test after 1000ms'));
  });

  it('can be aborted by given signal', async () => {
    const mockFetch = jest.fn((path, { signal }) => handleSignal(signal));

    const controller = new AbortController();
    const enhancedFetch = createTimeoutFetch(2000)(mockFetch);
    const promise = enhancedFetch('/test', { signal: controller.signal });
    controller.abort();
    jest.advanceTimersByTime(100);
    expect(controller.signal.aborted).toBeTruthy();
    await expect(promise).rejects.toEqual(new Error('aborted: true'));
  });
});
