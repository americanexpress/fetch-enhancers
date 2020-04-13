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

const TimeoutError = require('../src/TimeoutError');

describe('TimeoutError', () => {
  let error;
  const message = 'oh no bad times';

  beforeEach(() => {
    error = new TimeoutError(message);
  });

  it('is an instance of Error', () => {
    expect(error).toBeInstanceOf(Error);
  });

  it('is an instance of TimeoutError', () => {
    expect(error).toBeInstanceOf(TimeoutError);
  });

  it('is named "TimeoutError"', () => {
    expect(error.name).toEqual('TimeoutError');
  });

  it('has the message given', () => {
    expect(error.message).toEqual(message);
  });

  it('has a stack, if available', () => {
    const testError = new Error('test');
    if (!testError.stack) {
      // runtime doesn't support this property
      return;
    }

    expect(typeof error.stack).toBe(typeof testError.stack);
  });
});
