const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
	constructor(user, url, fromEmail = process.env.EMAIL_FROM, subject) {
		this.name = `${user.firstName} ${user.lastName}`;
		this.fName = user.firstName;
		this.lName = user.lastName;
		this.url = url;
		this.from = fromEmail;
		this.subject = subject;
		this.sgMail = require('@sendgrid/mail');
		this.sgMail.setApiKey(process.env.SG_API_KEY);
		this.sendRealMail = true;
		this.testEmail = 'chuck@mailsac.com';
		this.to = user.email;
		// process.env.NODE_ENV === 'development' || this.sendRealMail
		//   ? user.email
		//   : this.testEmail;
	}

	//send the actual email
	async send(template, subject) {
		try {
			//1. render html for email, based on pug template
			const html = pug.renderFile(
				`${__dirname}/../views/email/${template}.pug`,
				{
					name: `${this.fName} ${this.lName}`,
					url: this.url,
					subject,
				}
			);

			//2. define email options
			const msg = {
				from: this.from,
				to:
					this.sendRealMail && process.env.NODE_ENV === 'production'
						? this.to
						: this.testEmail,
				subject,
				html,
				text: htmlToText.fromString(html),
			};

			//3. create a transport and send the e-mail
			this.sgMail.setApiKey(process.env.SG_API_KEY);
			await this.sgMail.send(msg);
		} catch (err) {
			console.log(err);
		}
	}

	async sendWelcome() {
		try {
			//1. render html for email, based on pug template
			const html = pug.renderFile(`${__dirname}/../views/email/welcome.pug`, {
				name: this.firstName,
				url: this.url,
			});

			//2. define email options
			const msg = {
				from: process.env.EMAIL_FROM,
				to: this.sendRealMail ? this.to : this.testEmail,
				subject: this.subject,
				html,
				text: htmlToText.fromString(html),
			};

			//3. create a transport and send the e-mail

			const result = await this.sgMail.send(msg);
			return result;
		} catch (err) {
			console.log(err);
		}
	}

	async sendPasswordReset() {
		try {
			//1. render html for email, based on pug template
			const html = pug.renderFile(
				`${__dirname}/../views/email/passwordReset.pug`,
				{
					name: this.fName,
					url: this.url,
				}
			);

			//2. define email options
			const msg = {
				from: process.env.EMAIL_FROM,
				to:
					this.sendRealMail && process.env.NODE_ENV === 'production'
						? this.to
						: this.testEmail,
				reply_to: process.env.EMAIL_FROM,
				subject: this.subject,
				html,
				text: htmlToText.fromString(html),
			};

			//3. create a transport and send the e-mail
			await this.sgMail.send(msg);
		} catch (err) {
			console.log(err);
		}
		// await this.send(
		//   'passwordReset',
		//   'Your G-Jeopardy password reset token (valid for 10 minutes)',
		//   process.env.EMAIL_FROM
		// );
	}

	async sendManagerRequest() {
		try {
			const html = pug.renderFile(
				`${__dirname}/../views/email/managerRequest.pug`,
				{
					name: this.fName,
					url: this.url,
				}
			);
			const msg = {
				from: process.env.EMAIL_FROM,
				to:
					this.sendRealMail && process.env.NODE_ENV === 'production'
						? this.to
						: this.testEmail,
				reply_to: process.env.EMAIL_FROM,
				subject: `Your UltiStats password reset token (valid for 10 minutes)`,
				html,
				text: htmlToText.fromString(html),
			};

			await this.sgMail.send(msg);
		} catch (err) {
			console.log(err);
		}
	}
};
