# BREVO SDK Documentation

Title: Node.js SDK
Subtitle: Learn how to integrate the Brevo API into your Node.js and browser applications.

> [!IMPORTANT]
>
> https://developers.brevo.com/docs/api-clients/node-js

> [!IMPORTANT]
>
> Scrape GitHub: https://github.com/getbrevo/brevo-node/tree/v5

## Overview

The Brevo Node.js SDK (`@getbrevo/brevo`) is a TypeScript-first client library for the Brevo API. It provides:

* A unified `BrevoClient` with namespaced service clients
* Full TypeScript types with IDE autocomplete
* Promise-based async/await API
* Automatic retries with exponential backoff
* Custom fetch support for any runtime
* Structured error handling with typed error classes

> [!WARNING]
>
>  Version 5.0 is not backwards compatible with the v3.x SDK. The legacy v3.x SDK (`@getbrevo/brevo@^3.0.1`) will continue to receive critical security updates but no new features. We recommend migrating to v5.x for new and existing projects.

## Requirements

* Node.js 18+
* Also compatible with: Vercel, Cloudflare Workers, Deno v1.25+, Bun 1.0+, React Native

## Installation

```bash
npm install @getbrevo/brevo
```

## Quick start

Initialize the client and send your first email:

  ```typescript title="quick-start.ts"
  import { BrevoClient } from '@getbrevo/brevo';

  const brevo = new BrevoClient({ apiKey: 'your-api-key' });

  const result = await brevo.transactionalEmails.sendTransacEmail({
    subject: 'Hello from Brevo!',
    htmlContent: '<html><body><p>Hello,</p><p>This is my first transactional email.</p></body></html>',
    sender: { name: 'Alex from Brevo', email: 'hello@brevo.com' },
    to: [{ email: 'johndoe@example.com', name: 'John Doe' }],
  });

  console.log('Email sent. Message ID:', result.messageId);
  ```
## Configuration

Pass options to the constructor to configure timeout, retries, and other settings:

  ```typescript title="configuration.ts"
  const brevo = new BrevoClient({
    apiKey: 'your-api-key',
    timeoutInSeconds: 30,
    maxRetries: 3,
  });
  ```
### Constructor options

| Option             | Type                     | Default  | Description                                        |
| ------------------ | ------------------------ | -------- | -------------------------------------------------- |
| `apiKey`           | `string`                 | Required | Your Brevo API key                                 |
| `timeoutInSeconds` | `number`                 | `60`     | Default request timeout in seconds                 |
| `maxRetries`       | `number`                 | `2`      | Maximum retry attempts on retryable errors         |
| `baseUrl`          | `string`                 | `null`   | Override the default API base URL                  |
| `fetch`            | `typeof fetch`           | `null`   | Custom fetch implementation                        |
| `headers`          | `Record<string, string>` | `null`   | Additional default headers sent with every request |
| `logging`          | `LogConfig \| Logger`    | `null`   | Logging configuration                              |

## Error handling

The SDK throws typed error classes based on HTTP status codes:

  ```typescript title="error-handling.ts"
  import {
    BrevoError,
    UnauthorizedError,
    TooManyRequestsError,
  } from '@getbrevo/brevo';

  try {
    await brevo.transactionalEmails.sendTransacEmail({ ... });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      console.error('Invalid API key');
    } else if (err instanceof TooManyRequestsError) {
      const retryAfter = err.rawResponse.headers['retry-after'];
      console.error(`Rate limited. Retry after ${retryAfter}s`);
    } else if (err instanceof BrevoError) {
      console.error(`API error ${err.statusCode}:`, err.message);
    }
  }
  ```
### Error classes

| Status code | Class                      |
| ----------- | -------------------------- |
| `400`       | `BadRequestError`          |
| `401`       | `UnauthorizedError`        |
| `403`       | `ForbiddenError`           |
| `404`       | `NotFoundError`            |
| `422`       | `UnprocessableEntityError` |
| `429`       | `TooManyRequestsError`     |
| `500+`      | `InternalServerError`      |

All `BrevoError` instances expose:

* `statusCode` — HTTP status code
* `message` — Error message
* `body` — Parsed response body
* `rawResponse` — Raw response with headers

## Retries

Automatic retries with exponential backoff are enabled by default (2 retries). Configure at the client or request level:

  ```typescript title="retries.ts"
  // Client-level
  const brevo = new BrevoClient({
    apiKey: 'your-api-key',
    maxRetries: 3,
  });

  // Request-level (overrides client setting)
  await brevo.transactionalEmails.sendTransacEmail({ ... }, {
    maxRetries: 0, // Disable retries for this request
  });
  ```
### Retry behavior

* **Retryable status codes**: `408`, `429`, `500`, `502`, `503`, `504`
* **Backoff schedule**: \~1s, \~2s, \~4s (exponential with jitter)
* **Rate limit headers**: Respects `Retry-After` response header

## Timeouts

Default timeout is 60 seconds. Configure at the client or request level:

  ```typescript title="timeouts.ts"
  // Client-level
  const brevo = new BrevoClient({
    apiKey: 'your-api-key',
    timeoutInSeconds: 30,
  });

  // Request-level (overrides client setting)
  await brevo.transactionalEmails.sendTransacEmail({ ... }, {
    timeoutInSeconds: 10,
  });
  ```
### Recommended timeout values

| Use case                | Timeout            |
| ----------------------- | ------------------ |
| Standard API calls      | `30–60s` (default) |
| Quick operations        | `10–15s`           |
| Bulk operations         | `120–300s`         |
| Real-time / low-latency | `5–10s`            |

## Request options

All service methods accept a request options object as the final argument:

  ```typescript title="request-options.ts"
  await brevo.transactionalEmails.sendTransacEmail({ ... }, {
    timeoutInSeconds: 10,
    maxRetries: 1,
    headers: { 'X-Custom-Header': 'custom-value' },
    queryParams: { customParam: 'value' },
  });
  ```
### Abort signal

Cancel in-flight requests using the Web `AbortController` API:

  ```typescript title="abort-signal.ts"
  const controller = new AbortController();

  await brevo.transactionalEmails.sendTransacEmail({ ... }, {
    abortSignal: controller.signal,
  });

  controller.abort(); // Cancel the request
  ```
### Raw response

Access response headers and metadata via `.withRawResponse()`:

  ```typescript title="raw-response.ts"
  const { data, rawResponse } = await brevo.transactionalEmails
    .sendTransacEmail({ ... })
    .withRawResponse();

  console.log(rawResponse.headers['x-request-id']);
  console.log(data.messageId);
  ```
## Binary responses

Endpoints that return binary content (e.g., attachment downloads) expose multiple consumption methods:

  ```typescript title="binary-responses.ts"
  const response = await brevo.inboundParsing.getInboundEmailAttachment(downloadToken);

  const stream      = response.stream();
  const arrayBuffer = await response.arrayBuffer();
  const blob        = await response.blob();
  const bytes       = await response.bytes();
  ```
### Saving binary content

```
<AccordionGroup>
  <Accordion title="Node.js (ReadableStream)">
import { createWriteStream } from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
    const stream = response.stream();
    await pipeline(Readable.fromWeb(stream), createWriteStream('path/to/file'));
  </Accordion>
  <Accordion title="Bun">
    typescript
    await Bun.write('path/to/file', response.stream());
  </Accordion>
 <Accordion title="Browser">
 const blob = await response.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'filename';
a.click();
URL.revokeObjectURL(url);
  </Accordion>
</AccordionGroup>
```

## TypeScript types

All request and response types are exported from the package:

  ```typescript title="typescript-types.ts"
  import type { Brevo } from '@getbrevo/brevo';

  const request: Brevo.SendTransacEmailRequest = {
    subject: 'First email',
    textContent: 'Hello world!',
    sender: { name: 'Bob Wilson', email: 'bob.wilson@brevo.com' },
    to: [{ email: 'sarah.davis@example.com', name: 'Sarah Davis' }],
  };
  ```
## Logging

Configure logging to inspect outgoing requests and responses:

  ```typescript title="logging.ts"
  import { BrevoClient, logging } from '@getbrevo/brevo';

  const brevo = new BrevoClient({
    apiKey: 'your-api-key',
    logging: {
      level: logging.LogLevel.Debug,
      logger: new logging.ConsoleLogger(),
    },
  });
  ```
### Custom logger

Integrate with any logging library by implementing the `ILogger` interface:

  ```typescript title="custom-logger.ts"
  import winston from 'winston';
  import { logging } from '@getbrevo/brevo';

  const winstonLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });

  const logger: logging.ILogger = {
    debug: (msg, ...args) => winstonLogger.debug(msg, ...args),
    info:  (msg, ...args) => winstonLogger.info(msg, ...args),
    warn:  (msg, ...args) => winstonLogger.warn(msg, ...args),
    error: (msg, ...args) => winstonLogger.error(msg, ...args),
  };

  const brevo = new BrevoClient({
    apiKey: 'your-api-key',
    logging: { level: logging.LogLevel.Debug, logger },
  });
  ```
## Custom fetch

Override the default fetch implementation for any runtime or to add request interceptors:

  ```typescript title="custom-fetch.ts"
  const brevo = new BrevoClient({
    apiKey: 'your-api-key',
    fetch: async (url, options) => {
      console.log('→', url);
      const response = await fetch(url, options);
      console.log('←', response.status);
      return response;
    },
  });
  ```
### Common integrations



    <AccordionGroup>
      <Accordion title="node-fetch">
        import fetch from 'node-fetch';
    const brevo = new BrevoClient({
      apiKey: 'your-api-key',
      fetch: fetch as typeof globalThis.fetch,
    });
     </Accordion>
    
      <Accordion title="undici">
        import { fetch } from 'undici';
    
        const brevo = new BrevoClient({
          apiKey: 'your-api-key',
          fetch: fetch as typeof globalThis.fetch,
        });
    
      </Accordion>
    
      <Accordion title="With request ID header">
        import { randomUUID } from 'crypto';
    
        const brevo = new BrevoClient({
          apiKey: 'your-api-key',
          fetch: async (url, options) => {
            return fetch(url, {
              ...options,
              headers: {
                ...options?.headers,
                'X-Request-ID': randomUUID(),
              },
            });
          },
        });
      </Accordion>
    </AccordionGroup>
 Available services

The `BrevoClient` exposes the following service namespaces:

| Property                | Description                                                 |
| ----------------------- | ----------------------------------------------------------- |
| `transactionalEmails`   | Send emails, manage templates, blocked contacts and domains |
| `transactionalSms`      | Send SMS messages and view delivery statistics              |
| `transactionalWhatsApp` | Send WhatsApp messages and view event reports               |
| `smsTemplates`          | Manage SMS templates                                        |
| `contacts`              | Manage contacts, lists, folders, attributes and segments    |
| `emailCampaigns`        | Create and manage email marketing campaigns                 |
| `smsCampaigns`          | Create and manage SMS marketing campaigns                   |
| `whatsAppCampaigns`     | Create and manage WhatsApp campaigns and templates          |
| `companies`             | Manage CRM companies                                        |
| `deals`                 | Manage CRM deals and pipelines                              |
| `tasks`                 | Manage CRM tasks                                            |
| `notes`                 | Manage CRM notes                                            |
| `files`                 | Upload and manage CRM files                                 |
| `conversations`         | Manage conversation messages and automated messages         |
| `ecommerce`             | Manage products, categories, orders and attribution         |
| `coupons`               | Manage coupon collections and coupons                       |
| `payments`              | Create and manage payment requests                          |
| `event`                 | Track custom events                                         |
| `webhooks`              | Manage webhooks                                             |
| `senders`               | Manage senders and IPs                                      |
| `domains`               | Manage and authenticate domains                             |
| `account`               | Retrieve account information and activity logs              |
| `inboundParsing`        | Retrieve inbound email events and attachments               |
| `customObjects`         | Manage custom object records                                |
| `externalFeeds`         | Manage external RSS feeds                                   |
| `masterAccount`         | Manage sub-accounts and groups (enterprise)                 |
| `user`                  | Manage users and permissions                                |
| `process`               | Retrieve background process status                          |
| `program`               | Manage loyalty programs                                     |
| `balance`               | Manage loyalty balances and transactions                    |
| `reward`                | Manage loyalty rewards and vouchers                         |
| `tier`                  | Manage loyalty tiers and tier groups                        |

## Migration from v3.x

### Key changes

| Area       | v3.x                                                 | v5.x                                  |
| ---------- | ---------------------------------------------------- | ------------------------------------- |
| Client     | `new TransactionalEmailsApi()` per resource          | `new BrevoClient({ apiKey })` unified |
| Auth       | `(api as any).authentications.apiKey.apiKey = "..."` | Constructor option                    |
| API style  | Class-based with setters                             | Promise-based with inline objects     |
| TypeScript | Partial                                              | Full, exported types                  |
| Retries    | Not built-in                                         | Automatic with exponential backoff    |

### Migration example

  ```typescript title="v3-example.ts"
  // v3.x
  import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';

  let emailAPI = new TransactionalEmailsApi();
  (emailAPI as any).authentications.apiKey.apiKey = 'xkeysib-xxx';

  let message = new SendSmtpEmail();
  message.subject = 'First email';
  message.textContent = 'Hello world!';
  message.sender = { name: 'Bob Wilson', email: 'bob.wilson@brevo.com' };
  message.to = [{ email: 'sarah.davis@example.com', name: 'Sarah Davis' }];

  emailAPI.sendTransacEmail(message);
  ```

  ```typescript title="v5-example.ts"
  // v5.x
  import { BrevoClient } from '@getbrevo/brevo';

  const brevo = new BrevoClient({ apiKey: 'xkeysib-xxx' });

  await brevo.transactionalEmails.sendTransacEmail({
    subject: 'First email',
    textContent: 'Hello world!',
    sender: { name: 'Bob Wilson', email: 'bob.wilson@brevo.com' },
    to: [{ email: 'sarah.davis@example.com', name: 'Sarah Davis' }],
  });
  ```
## Resources

* [GitHub Repository](https://github.com/getbrevo/brevo-node/tree/v4)

* [npm Package](https://www.npmjs.com/package/@getbrevo/brevo)

* [API Reference](https://developers.brevo.com/reference)

  