const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');
const Mustache = require('mustache');

// Create custom renderer with specific handling
const renderer = {
    heading(text, level) {
        return `<h${level}>${text}</h${level}>\n`;
    },
    paragraph(text) {
        return `<p>${text}</p>\n`;
    },
    list(body, ordered) {
        const type = ordered ? 'ol' : 'ul';
        return `<${type}>\n${body}</${type}>\n`;
    },
    listitem(text) {
        return `<li>${text}</li>\n`;
    },
    code(code, language) {
        return `<pre><code class="language-${language}">${code}</code></pre>\n`;
    },
    blockquote(quote) {
        return `<blockquote>${quote}</blockquote>\n`;
    }
};

// Configure marked for code highlighting and HTML output
marked.setOptions({
    renderer: renderer,
    headerIds: false,
    mangle: false,
    gfm: true,
    breaks: true,
    pedantic: false,
    smartLists: true,
});

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function buildBlogPost(markdownPath, templatePath, outputPath) {
    try {
        // Read markdown file and template
        const markdownContent = fs.readFileSync(markdownPath, 'utf-8');
        const template = fs.readFileSync(templatePath, 'utf-8');

        // Parse frontmatter and markdown
        const { data, content } = matter(markdownContent);
        
        // Convert markdown to HTML with proper rendering
        let htmlContent = marked.parse(content);
        
        // Clean up any potential double-escaping
        htmlContent = htmlContent
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

        // Prepare template data
        const templateData = {
            title: data.title || 'Untitled',
            date: data.date || new Date(),
            formatted_date: formatDate(data.date),
            tags: data.tags || [],
            description: data.description || '',
            content: htmlContent
        };

        // Render template
        const renderedHtml = Mustache.render(template, templateData);

        // Write output file
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(outputPath, renderedHtml);
        console.log(`Successfully built blog: ${outputPath}`);
    } catch (error) {
        console.error('Error building blog:', error);
    }
}

// Example usage
const markdownPath = process.argv[2];
const outputPath = process.argv[3];
const templatePath = path.join(__dirname, '../templates/blog/template.html');

// Export the buildBlogPost function
module.exports = function(markdownPath, outputPath) {
    buildBlogPost(markdownPath, templatePath, outputPath);
};

// Only run directly if called from command line
if (require.main === module) {
    const markdownPath = process.argv[2];
    const outputPath = process.argv[3];
    buildBlogPost(markdownPath, templatePath, outputPath);
} 