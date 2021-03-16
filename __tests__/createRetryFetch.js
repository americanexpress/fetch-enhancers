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

const createRetryFetch = require('../src/createRetryFetch');
const createTimeoutFetch = require('../src/createTimeoutFetch');
const TimeoutError = require('../src/TimeoutError');

function resolveInMs(ms) {
  return new Promise((resolve) => {
    setTimeout(() => resolve('Fetch Resolved'), ms);
  });
}

describe('createRetryFetch', () => {
  it('should resolve if the response finishes before the default timeout', async () => {
    const mockFetch = jest.fn(() => resolveInMs(100));
    const anotherEnhancedFetch = createTimeoutFetch(500);
    const enhancedFetch = createRetryFetch(anotherEnhancedFetch)(mockFetch);
    const promise = enhancedFetch('/test');
    await expect(promise).resolves.toBe('Fetch Resolved');
  });

  it('should not retry if the response finishes before the default timeout', async () => {
    const mockFetch = jest.fn(() => resolveInMs(100));
    const timeoutFetch = createTimeoutFetch(500);
    const enhancedFetch = createRetryFetch(timeoutFetch)(mockFetch);
    const promise = enhancedFetch('/test');
    await expect(promise).resolves.toBe('Fetch Resolved');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should retry 3 times (default) if the response takes longer than custom timeout that is shorter than the default', async () => {
    const mockFetch = jest.fn(() => resolveInMs(500));
    const timeoutFetch = createTimeoutFetch(100);
    const enhancedFetch = createRetryFetch(timeoutFetch)(mockFetch);
    const promise = enhancedFetch('/test');
    await expect(promise).rejects.toEqual(new TimeoutError('/test after 100ms'));
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('should retry 1 time if the response takes longer than custom timeout that is shorter than the default', async () => {
    const mockFetch = jest.fn(() => resolveInMs(500));
    const timeoutFetch = createTimeoutFetch(100);
    const enhancedFetch = createRetryFetch(timeoutFetch, 1)(mockFetch);
    const promise = enhancedFetch('/test');
    await expect(promise).rejects.toEqual(new TimeoutError('/test after 100ms'));
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should run supplied backoff strategy with retry count', async () => {
    const mockBackoffStrategy = jest.fn((retryCount) => {
      expect(retryCount).toEqual(1);
      return Promise.resolve();
    });
    const mockFetch = jest.fn(() => resolveInMs(500));
    const timeoutFetch = createTimeoutFetch(100);
    const enhancedFetch = createRetryFetch(timeoutFetch, 1, mockBackoffStrategy)(mockFetch);
    const promise = enhancedFetch('/test');
    await expect(promise).rejects.toEqual(new TimeoutError('/test after 100ms'));
    expect(mockBackoffStrategy).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
