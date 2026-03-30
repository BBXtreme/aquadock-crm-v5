// postcss.config.mjs
/* PostCSS configuration file
This file is used to configure PostCSS, a tool for transforming CSS with 
JavaScript plugins.
In this configuration, we are using the Tailwind CSS plugin to enable 
Tailwind's utility-first CSS framework.
*/
export default {
	plugins: {
		"@tailwindcss/postcss": {},
	},
};
