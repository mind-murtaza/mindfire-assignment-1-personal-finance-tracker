/**
 * @fileoverview Email Service - Centralized Email Management
 *
 * Enterprise-grade email service using Nodemailer with template support,
 * error handling, and comprehensive logging. Follows Agent.md DRY principles
 * with reusable email components and template system.
 *
 * Features:
 * - Template-based email system
 * - Environment-based configuration
 * - Comprehensive error handling
 * - Email queue support (future)
 * - Multi-provider support (Mailtrap, SendGrid, etc.)
 *
 * @module utils/email/emailService
 * @author Murtaza
 * @version 1.0.0
 * @since 1.0.0
 * @requires nodemailer
 */

const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs").promises;
require("dotenv").config();
// =================================================================
// EMAIL CONFIGURATION
// =================================================================

/**
 * Email service configuration
 * @constant {Object} EMAIL_CONFIG
 */
const EMAIL_CONFIG = {
	// SMTP Configuration
	smtp: {
		host: process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io",
		port: parseInt(process.env.SMTP_PORT) || 2525,
		auth: {
			user: process.env.SMTP_USER || "2c6029dce7266a",
			pass: process.env.SMTP_PASS || "98d923a27b5363",
		},
	},

	// Default sender information
	defaults: {
		from:
			process.env.EMAIL_FROM ||
			"Personal Finance Tracker <noreply@financetracker.com>",
		replyTo: process.env.EMAIL_REPLY_TO || "support@financetracker.com",
	},

	// Template configuration
	templates: {
		baseUrl: process.env.CLIENT_BASE_URL || "http://localhost:3000",
		templatesPath: path.join(__dirname, "templates"),
	},

	// Rate limiting and retry
	rateLimit: {
		maxRetries: 3,
		retryDelay: 1000, // ms
	},
};

const appName = process.env.APP_NAME || "Personal Finance Tracker";

// =================================================================
// EMAIL TRANSPORT SETUP
// =================================================================

/**
 * Create and configure Nodemailer transport
 * @returns {Object} Configured nodemailer transport
 */
function createTransport() {
	const transport = nodemailer.createTransport(EMAIL_CONFIG.smtp);

	// Verify connection configuration
	transport.verify((error, success) => {
		if (error) {
			console.error("❌ Email service connection failed:", error.message);
		} else {
			console.log("✅ Email service ready to send messages");
		}
	});

	return transport;
}

// Initialize transport
const emailTransport = createTransport();

// =================================================================
// TEMPLATE SYSTEM
// =================================================================

/**
 * Load and process email template
 * @param {string} templateName - Template file name (without .html extension)
 * @param {Object} variables - Variables to replace in template
 * @returns {Promise<string>} Processed HTML template
 */
async function loadTemplate(templateName, variables = {}) {
	try {
		const templatePath = path.join(
			EMAIL_CONFIG.templates.templatesPath,
			`${templateName}.html`
		);
		let template = await fs.readFile(templatePath, "utf-8");

		// Replace template variables
		Object.keys(variables).forEach((key) => {
			const regex = new RegExp(`{{${key}}}`, "g");
			template = template.replace(regex, variables[key] || "");
		});

		return template;
	} catch (error) {
		console.error(
			`❌ Failed to load email template "${templateName}":`,
			error.message
		);

		// Fallback to plain text
		return `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>{{subject}}</h2>
        <p>{{message}}</p>
      </div>
    `
			.replace(/{{subject}}/g, variables.subject || "Notification")
			.replace(
				/{{message}}/g,
				variables.message || "This is an automated message."
			);
	}
}

// =================================================================
// CORE EMAIL FUNCTIONS
// =================================================================

/**
 * Send email with retry logic and error handling
 * @param {Object} emailOptions - Email configuration
 * @param {string} emailOptions.to - Recipient email address
 * @param {string} emailOptions.subject - Email subject
 * @param {string} emailOptions.html - HTML content
 * @param {string} [emailOptions.text] - Plain text content
 * @param {string} [emailOptions.from] - Sender email (optional)
 * @param {number} [retryCount=0] - Current retry attempt
 * @returns {Promise<Object>} Email send result
 */
async function sendEmail(emailOptions, retryCount = 0) {
	try {
		const mailOptions = {
			from: emailOptions.from || EMAIL_CONFIG.defaults.from,
			to: emailOptions.to,
			subject: emailOptions.subject,
			html: emailOptions.html,
			text: emailOptions.text || emailOptions.html?.replace(/<[^>]*>/g, ""), // Strip HTML for text
			replyTo: EMAIL_CONFIG.defaults.replyTo,
		};

		const result = await emailTransport.sendMail(mailOptions);

		console.log(
			`✅ Email sent successfully to ${emailOptions.to}:`,
			result.messageId
		);
		return {
			success: true,
			messageId: result.messageId,
			to: emailOptions.to,
			subject: emailOptions.subject,
		};
	} catch (error) {
		console.error(
			`❌ Email send failed (attempt ${retryCount + 1}):`,
			error.message
		);

		// Retry logic
		if (retryCount < EMAIL_CONFIG.rateLimit.maxRetries) {
			console.log(
				`🔄 Retrying email send in ${EMAIL_CONFIG.rateLimit.retryDelay}ms...`
			);
			await new Promise((resolve) =>
				setTimeout(resolve, EMAIL_CONFIG.rateLimit.retryDelay)
			);
			return sendEmail(emailOptions, retryCount + 1);
		}

		// Max retries exceeded
		throw new Error(
			`Email delivery failed after ${EMAIL_CONFIG.rateLimit.maxRetries} attempts: ${error.message}`
		);
	}
}

/**
 * Send template-based email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.template - Template name
 * @param {Object} options.variables - Template variables
 * @returns {Promise<Object>} Email send result
 */
async function sendTemplateEmail(options) {
	const { to, subject, template, variables = {} } = options;

	// Add common variables
	const templateVariables = {
		...variables,
		subject,
		baseUrl: EMAIL_CONFIG.templates.baseUrl,
		year: new Date().getFullYear(),
		appName: appName,
	};

	const html = await loadTemplate(template, templateVariables);

	return sendEmail({
		to,
		subject,
		html,
	});
}

// =================================================================
// AUTHENTICATION EMAIL METHODS
// =================================================================

/**
 * Send email verification email
 * @param {string} email - User's email address
 * @param {string} verificationToken - Email verification token
 * @param {string} userName - User's name
 * @returns {Promise<Object>} Email send result
 */
async function sendEmailVerification(email, verificationToken, userName) {
	const verificationUrl = `${EMAIL_CONFIG.templates.baseUrl}/verify-email?token=${verificationToken}`;

	return sendTemplateEmail({
		to: email,
		subject: "Verify Your Email Address",
		template: "email-verification",
		variables: {
			userName,
			verificationUrl,
			verificationToken,
		},
	});
}

/**
 * Send password reset email
 * @param {string} email - User's email address
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name
 * @returns {Promise<Object>} Email send result
 */
async function sendPasswordReset(email, resetToken, userName) {
	const resetUrl = `${EMAIL_CONFIG.templates.baseUrl}/reset-password?token=${resetToken}`;

	return sendTemplateEmail({
		to: email,
		subject: "Reset Your Password",
		template: "password-reset",
		variables: {
			userName,
			resetUrl,
			resetToken,
			expiryTime: "1 hour",
		},
	});
}

/**
 * Send OTP code for passwordless login
 * @param {string} email - User's email address
 * @param {string} otpCode - 6-digit OTP code
 * @param {string} userName - User's name
 * @returns {Promise<Object>} Email send result
 */
async function sendOTPCode(email, otpCode, userName) {
	return sendTemplateEmail({
		to: email,
		subject: "Your Login Code",
		template: "otp-login",
		variables: {
			userName,
			otpCode,
			expiryTime: "10 minutes",
		},
	});
}

/**
 * Send welcome email after successful registration
 * @param {string} email - User's email address
 * @param {string} userName - User's name
 * @returns {Promise<Object>} Email send result
 */
async function sendWelcomeEmail(email, userName) {
	return sendTemplateEmail({
		to: email,
		subject: `Welcome to ${appName}!`,
		template: "welcome",
		variables: {
			userName,
			loginUrl: `${EMAIL_CONFIG.templates.baseUrl}/login`,
			dashboardUrl: `${EMAIL_CONFIG.templates.baseUrl}/dashboard`,
		},
	});
}


// =================================================================
// MODULE EXPORTS
// =================================================================

module.exports = {
	sendEmailVerification,
	sendPasswordReset,
	sendOTPCode,
	sendWelcomeEmail,
};
