/**
 * Throws an error with a message indicating that the specified environment variable is required.
 *
 * @param {string} envVarName - the name of the environment variable
 * @return {never}
 */
export function throwEnvironmentError(envVarName: string): never {
	throw new Error(`Environment variable ${envVarName} is required.`);
}
