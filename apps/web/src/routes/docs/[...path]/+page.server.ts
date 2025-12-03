import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import fs from 'node:fs';
import path from 'node:path';

export const load: PageServerLoad = async ({ params }) => {
	const docPath = params.path || 'index';

	// Redirect .html URLs to clean URLs
	if (docPath.endsWith('.html')) {
		const cleanPath = docPath.slice(0, -5);
		throw redirect(301, `/docs/${cleanPath}`);
	}

	// Construct the file path
	const staticDocsPath = path.join(process.cwd(), 'static', 'docs', `${docPath}.html`);

	// Check if file exists
	if (!fs.existsSync(staticDocsPath)) {
		throw error(404, 'Documentation page not found');
	}

	// Read the HTML content
	const htmlContent = fs.readFileSync(staticDocsPath, 'utf-8');

	return {
		htmlContent,
		path: docPath
	};
};
