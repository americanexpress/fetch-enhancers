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

describe('createRetryFetch', () => {
  it('should resolve on success', async () => {
    const mockFetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve('Fetch Resolved'));
    const enhancedFetch = createRetryFetch()(mockFetch);
    await expect(enhancedFetch('/')).resolves.toBe('Fetch Resolved');
  });

  it('should reject on failure', async () => {
    const mockFetch = jest.fn()
      .mockImplementationOnce(() => Promise.reject(new Error('test rejection error')))
      .mockImplementationOnce(() => Promise.reject(new Error('test rejection error')))
      .mockImplementationOnce(() => Promise.reject(new Error('test rejection error')))
      .mockImplementationOnce(() => Promise.reject(new Error('test rejection error')));
    const enhancedFetch = createRetryFetch()(mockFetch);
    await expect(enhancedFetch('/')).rejects.toEqual(new Error('test rejection error'));
  });

  it('should not retry on a success', async () => {
    const mockFetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve('Fetch Resolved'));
    const enhancedFetch = createRetryFetch()(mockFetch);
    await expect(enhancedFetch('/')).resolves.toBe('Fetch Resolved');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should retry default 3 times on reject', async () => {
    const mockFetch = jest.fn()
      .mockImplementationOnce(() => Promise.reject(new Error('test rejection error')))
      .mockImplementationOnce(() => Promise.reject(new Error('test rejection error')))
      .mockImplementationOnce(() => Promise.reject(new Error('test rejection error')))
      .mockImplementationOnce(() => Promise.resolve('Fetch Resolved'));
    const enhancedFetch = createRetryFetch()(mockFetch);
    await expect(enhancedFetch('/')).resolves.toBe('Fetch Resolved');
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('should retry the supplied max retries', async () => {
    const mockFetch = jest.fn()
      .mockImplementationOnce(() => Promise.reject(new Error('test rejection error')))
      .mockImplementationOnce(() => Promise.resolve('Fetch Resolved'));
    const enhancedFetch = createRetryFetch(1)(mockFetch);
    await expect(enhancedFetch('/')).resolves.toBe('Fetch Resolved');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should run supplied backoff strategy with suppied max retries', async () => {
    const mockBackoffStrategy = jest.fn((retryCount) => {
      expect(retryCount).toEqual(1);
      return Promise.resolve();
    });
    const mockFetch = jest.fn()
      .mockImplementationOnce(() => Promise.reject(new Error('test rejection error')))
      .mockImplementationOnce(() => Promise.resolve('Fetch Resolved'));
    const enhancedFetch = createRetryFetch(1,
      mockBackoffStrategy)(mockFetch);
    await expect(enhancedFetch('/')).resolves.toBe('Fetch Resolved');
    expect(mockBackoffStrategy).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
