# AWS SES Inbound Email Redirect Service 

A Lambda function to redirect SES inbound emails to an external address as an attachment, relatively easy to configure, with no data lost in the message's header and fully standard compliant.


## Features

Any of these settings are configurable through Lambda environment variables:

- Handling more than one custom email address, leveraging an alias table to map internal → external addresses.
- Defining a default From / To email address (if not in the alias table).
- Customizing the redirect message.
- Sending errors' copy via email to an administrator.


## Why this project?

Many privates or small businesses decide to buy a domain and to configure one or more custom email addresses. But because each one of them already have a personal email account somewhere else (Google, Yahoo, Hotmail, etc…) they don't want a full email box, but just a service that _redirects_ the emails.

Thanks to AWS SES + S3 + Lambda, with a relative small effort to orchestrate these three services, this is doable in a professional/production way and **barely for free!**

I know that around the web there are already a lot of solutions to accomplish this. The problem is that, most of them, are just a "it works" solution. They don't really satisfy some requirements, like:

- being able to map more than one custom address to one or more external email
- respect the IETF and W3C email standard specifics
- define an administrator email address to handle any potential error

### About email standards and specifics

First of all, let's make it clear what the differences are between **redirect** and **forward**:

- **Forward** means sending a new email to one or more addresses, including the original message in the body **indented**. This means _loosing almost any of the original header fields_ – especially FROM and TO – and _altering the original body_.
- **Redirect** means sending a new email to one or more addresses, altering – as little as possible – only the header part. The idea behind redirect is trying **to save as much information as possible** from the original message (possibly, leaving it untouched).

So, as you can imagine, doing a simply _copy and paste_ of a message, overwriting just the FROM and TO fields, and sending it to a new address, means loosing lots of information within the header, like:

- FROM
- TO (this is the most dangerous!)
- Message ID
- DATE
- SPAM information
- Custom fields
- Message path through servers

What do IETF and W3C say? Basically, there are two official ways to solve it:

1. **The Good one** — Using the "resent headers": that is, renaming the original TO and FROM headers in _Resent-To_ and _Resent-From_, set the new FROM and TO headers, copy everything else, send the new message. Doing like this, some header changes and someone else is overwritten, but even if the data lost is little, there is still.
2. **The Best one** — Attaching the original message to a new one: the original message is encapsulated to a new one, using the special `Content-type: message/rfc822`. Doing like this **the original message remains completely untouched**.

The latter one is what this project is all about: implementing a service to redirect messages leaving them untouched, compliant to standards.

For more information about this topic, you can check these two links:
- [IETF - Resent Headers](https://tools.ietf.org/html/rfc2076#section-3.14)
- [W3C - Message/RFC822 Content Type](https://www.w3.org/Protocols/rfc1341/7_3_Message.html)

### Costs

The moment I wrote this file, these are the actual costs per service:

- **Lambda**:
    - 0$ for the first 1 Million requests and 400 000 GB/seconds, both per month.
- **S3**:
    - 0.023$/GB (worst case).
- **SES**:
    - Sending (from an EC2 instance or Lambda function):
        - $0 for the first 62,000 emails sent per month.
    - Receiving:
        - $0 for the first 1,000 emails received per month.

To sum up, the implementation to this redirect service is **barely 100% free**.

More information at these links:  

- [AWS Lambda Pricing](https://aws.amazon.com/lambda/pricing/)  
- [AWS S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [AWS SES Pricing](https://aws.amazon.com/ses/pricing/)  


## How to use it

The following instructions don't pretend to be an exhaustive step-by-step walk through, but only a general guide about how to install, configure and use this software.  
For anything related to AWS services, domains or DNS entries, please refer to the official documentations.

### Requirements

- A proprietary domain with the rights to change DNS entries (using Route 53 is not mandatory).
- One or more external email addresses (Gmail, Yahoo, Hotmail, etc…).
- Node.js and npm installed in your local environment.
- An AWS account with these services already configured:
    - S3 private bucket.
    - SES outbound with **domain and external emails verified** (if you need more freedom, you have to send a request to Amazon to switch your account out from the sandbox mode. For most cases, sandbox mode is fine).

### Installing

1. **Download and pack the function:**
    - Clone this repository:
        - `git clone https://github.com/lcrea/aws-ses-email-redirect.git`
    - Install the dependencies (no dev required):
        - `npm install --production`
    - Pack everything in a zip file:
        - `zip -r9 aws-ses-email-redirect.zip .`
2. **Configure the Lambda function:**
    - Login to your AWS account
    - Create a new Lambda function (ex. `aws-ses-email-redirect`) in the **same region where you already configured SES**
    - Set as resources consumed by Lambda function:
        - CloudWatch Logs (automatically created by AWS)
        - S3: choose one object key (ex. `myfolder/mail`) in your bucket (ex. `my-bucket`) and give it the permission to **read** and **delete** within it
        - SES (this will be automatically created in the next step)
    - Set as runtime engine: **Node.js** (latest version)
    - Upload your zip file `aws-ses-email-redirect.zip`
    - Set as handler file: `lambda/app.handler`
    - Next, configure the environment variables (see below :point_down: )
3. **Configure SES inbound service**:
    - Login to your AWS account
    - Create a new rule set in `SES` > `Email Receiving`
    - Define how many email addresses (_recipients_) you need for your domain (ex. `me@mydomain.com`)
    - Create two actions **in this order**:
        1. **S3**: set the bucket (`my-bucket`) and the object key prefix (`myfolder/mail`) above
        2. **Lamdba**: select the lambda function (`aws-ses-email-redirect`) and `Event` as invocation type (this will be the trigger).

That's it!  
If you have correctly set permissions for Lamdba function, S3 and configured the environment variables (see below :point_down: ), your redirect service is already working :clap:
 
### Environment variables

Login to your AWS account and go to your Lambda function (`aws-ses-email-redirect`). Here you have to configure the following variables:

- **MANDATORY**
    - `DOMAIN`: your proprietary domain (`mydomain.com`)
    - `BUCKET_NAME`: this is your full S3 bucket + object key (`my-bucket/myfolder/mail`). You can think of it like the path where you are gonna save your emails
    - `DEFAULT_EMAIL_FROM`: this is the from address **without the domain part** to use in the redirected message (ex. `no-reply`). This address **does not need to exist**! It's just the from field the you're gonna see in the redirected email: it can be whatsoever.
    - `DEFAULT_EMAIL_TO`: this is the address to which redirect messages if not found in the alias table or if you haven't configured it (ex. `myemail@gmail.com`)
    - `REDIRECT_MESSAGE`: a default message to include in the body of the redirected email

- **OPTIONAL**
    - `ALIASES`: if you want to map more than one proprietary address to more than one external address, you need to specify an alias table as a JSON object like this: `{"me": "myemail@gmail.com", "info": "another-email@yahoo.com"}`. Again, internal proprietary addresses are **without the domain part**.
    - `ERROR_EMAIL_TO`: if you want to be notified by email of any possible errors in the redirect process, instead of checking them in the AWS CloudWatch logs, you can define an email address as an administrator.

### How does the alias table work?

The idea is strongly inspired by the Postfix alias map file. It's just a set (actually, a JSON Object) of inward addresses mapped to outward addresses, like this:

```javascript
{
    "me": "myemail@gmail.com",
    "info": "another-email@yahoo.com",
    "job": "always-me@hotmail.com",
}
```

So, if the custom domain is "mydomain.com" whoever will send an email to `me@mydomain.com` will be redirected to `myemail@gmail.com`; to `info@mydomain.com` will be redirected to `another-email@yahoo.com`; and so on. Also, thanks to the `DEFAULT_EMAIL_FROM` variable defined above, if an email is sent to an address not in the alias table, but **defined in the SES inbound settings** (like `help@mydomain.com`), it will be redirect to that address that works as a _catch all_. That's the reason why the alias table is "optional": most people don't even need it.

### Alias table examples:

#### 1 inward -> 1 outward email address

```
me@mydomain.com -> myemail@gmail.com
```

Configure `me@mydomain.com` in the SES inbound section. Then, inside the Lambda function, set:

```
DEFAULT_EMAIL_TO = myemail@gmail.com
```

No alias table is required.

#### 3 inward -> 1 outward email addresses

```
me@mydomain.com      -> work@yahoo.com
job@mydomain.com     -> work@yahoo.com
support@mydomain.com -> work@yahoo.com
```

Configure `me@mydomain.com`, `job@mydomain.com`, `support@mydomain.com` in the SES inbound section. Then, inside the Lambda function, set:

```
DEFAULT_EMAIL_TO = work@yahoo.com   // This works like a catchall
```

Again, no alias table is required.

#### 3 inward -> 2 outward email addresses

```
me@mydomain.com      -> myemail@gmail.com
job@mydomain.com     -> work@yahoo.com
support@mydomain.com -> work@yahoo.com
```

Configure `me@mydomain.com`, `job@mydomain.com`, `support@mydomain.com` in the SES inbound section. Then, inside the Lambda function, set:

```
ALIASES = { "me": "myemail@gmail.com" }
DEFAULT_EMAIL_TO = work@yahoo.com   // This works like a catchall
```


## Built With

* [Node.js v10.6](https://nodejs.org) — Main interpreter.
* [Nodemailer](https://nodemailer.com/) — Module to structure the new emails.
* [Jest](https://jestjs.io) — Test framework for internal code.
* [Amazon SAM CLI](https://github.com/awslabs/aws-sam-cli) — Local Lambda test environment.


## Author

Luca Crea — [https://www.linkedin.com/in/lucacrea](https://www.linkedin.com/in/lucacrea)


## License

This project is licensed under the MIT License. See the [LICENSE.txt](LICENSE.txt) file for details.
