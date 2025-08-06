const userSchemas = require("./user.schema");
const categorySchemas = require("./category.schema");
const transactionSchemas = require("./transaction.schema");
const commonSchemas = require("./common.schema");

module.exports = {
	...userSchemas,
	...categorySchemas,
	...transactionSchemas,
	...commonSchemas,
};
