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
import TimeoutError from './TimeoutError';

function abortFetch(controller, signal) {
  return () => {
    controller.abort();
    signal.removeEventListener('abort', abortFetch(controller, signal));
  };
}

function createTimeoutFetch(defaultTimeout) {
  return (nextFetch) => (path, options = {}) => {
    const controller = new AbortController();
    const timeoutSignal = controller.signal;
    const optionalSignal = options.signal;
    const timeout = options.timeout || defaultTimeout;
    let didTimeout;

    if (optionalSignal) {
      optionalSignal.addEventListener('abort', abortFetch(controller, optionalSignal));
    }

    return Promise.race([
      nextFetch(path, {
        ...options,
        signal: timeoutSignal,
      }),
      new Promise((_, reject) => {
        setTimeout(() => {
          didTimeout = true;
          // this will cause fetch to throw an 'AbortError'
          controller.abort();
          // fallback if controller.abort() does not work
          reject(new TimeoutError(`${path} after ${timeout}ms`));
        }, timeout);
      }),
    ]).catch((error) => {
      if (error.name === 'AbortError' && didTimeout) {
        throw new TimeoutError(`${path} after ${timeout}ms`);
      }
      throw error;
    });
  };
}

export default createTimeoutFetch;
