import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, EntryGenerator } from './$types';
import fs from 'node:fs';
import path from 'node:path';

// Generate all documentation page entries for prerendering
export const entries: EntryGenerator = () => {
	const docsDir = path.join(process.cwd(), 'static', 'docs');
	const entries: { path: string }[] = [];

	function findHtmlFiles(dir: string, basePath: string = '') {
		const files = fs.readdirSync(dir);

		for (const file of files) {
			const fullPath = path.join(dir, file);
			const stat = fs.statSync(fullPath);

			if (stat.isDirectory()) {
				findHtmlFiles(fullPath, path.join(basePath, file));
			} else if (file.endsWith('.html')) {
				const relativePath = path.join(basePath, file.slice(0, -5)); // Remove .html
				entries.push({ path: relativePath });
			}
		}
	}

	if (fs.existsSync(docsDir)) {
		findHtmlFiles(docsDir);
	}

	return entries;
};

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
