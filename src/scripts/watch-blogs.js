const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const Mustache = require('mustache');

// Directories to watch and output
const BLOG_DIR = 'src/content/blogs';
const BLOGS_LIST_FILE = 'src/pages/blogs/blogs.html';
const BLOG_TEMPLATE = 'src/templates/blog/template.html';

// Function to create a new blog HTML page
function createBlogPage(markdownFile) {
    try {
        // Read markdown and template
        const markdownContent = fs.readFileSync(markdownFile, 'utf-8');
        const template = fs.readFileSync(BLOG_TEMPLATE, 'utf-8');
        
        // Parse frontmatter and convert markdown
        const { data, content } = matter(markdownContent);
        const htmlContent = marked.parse(content);

        // Prepare template data
        const templateData = {
            title: data.title || 'Untitled',
            date: data.date || new Date(),
            formatted_date: formatDate(new Date(data.date)),
            tags: data.tags || [],
            description: data.description || '',
            content: htmlContent
        };

        // Generate HTML
        const renderedHtml = Mustache.render(template, templateData);

        // Create output directory if it doesn't exist
        const outputFile = getOutputPath(markdownFile);
        const outputDir = path.dirname(outputFile);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Write the HTML file
        fs.writeFileSync(outputFile, renderedHtml);
        console.log(`Created blog page: ${outputFile}`);

        // Update blogs listing
        updateBlogsListing();

    } catch (error) {
        console.error(`Error creating blog page for ${markdownFile}:`, error);
    }
}

// Function to update blogs listing page
function updateBlogsListing() {
    try {
        const blogFiles = getAllMarkdownFiles(BLOG_DIR);
        const blogs = blogFiles.map(file => {
            const content = fs.readFileSync(file, 'utf-8');
            const { data } = matter(content);
            console.log('Blog frontmatter:', data); // Debug log
            
            // Get the HTML file path relative to BLOG_DIR
            const relativePath = path.relative(BLOG_DIR, file);
            const htmlPath = relativePath.replace('.md', '.html');
            const blogPath = path.join('/src/pages/blogs', htmlPath).replace(/\\/g, '/');
            console.log(`Processing blog: ${file}`);
            console.log(`Generated path: ${blogPath}`);
            
            return {
                title: data.title || path.basename(file, '.md'),
                date: new Date(data.date || new Date()),
                path: blogPath,
                tags: Array.isArray(data.tags) ? data.tags : [],
                description: data.description || 'No description available',
                author: {
                    name: data.author || 'Swapnil Tiwari',
                    role: data.authorRole || 'Solutions Architect at AWS',
                    image: data.authorImage || '/src/assets/images/profile/Swapnil.jpeg'
                },
                readTime: calculateReadTime(content) || '5',
                category: data.category || 'Technology'
            };
        });

        // Sort blogs by date (newest first)
        blogs.sort((a, b) => b.date - a.date);

        // Generate blog list HTML
        const blogsTemplate = fs.readFileSync(BLOGS_LIST_FILE, 'utf-8');
        const blogListHTML = blogs.map(blog => {
            console.log('Generating HTML for blog:', blog);
            const fullPath = blog.path.startsWith('/src/pages/') 
            ? blog.path 
            : `/src/pages/${blog.path}`;
            return `
                <li>
                    <span class="post-date">${formatDate(blog.date)}:</span>
                    <a href="${fullPath}" class="post-link">${blog.title}</a>
                    <p class="blog-description">${blog.description}</p>
                    <div class="blog-tags">
                        ${blog.tags.map(tag => `<span class="tech-tag">${tag}</span>`).join('')}
                    </div>
                    <div class="blog-meta">
                        <span class="blog-author">By ${blog.author.name}</span>
                        <span class="blog-category">${blog.category}</span>
                        <span class="read-time">${blog.readTime} min read</span>
                    </div>
                </li>
            `;
        }).join('\n');

        // Update the blogs listing content
        const updatedContent = blogsTemplate.replace(
            /<ul class="blog-list">([\s\S]*?)<\/ul>/,
            `<ul class="blog-list">${blogListHTML}</ul>`
        );

        fs.writeFileSync(BLOGS_LIST_FILE, updatedContent);
        console.log('Updated blogs listing page with all metadata');

    } catch (error) {
        console.error('Error updating blogs listing:', error);
        console.error(error.stack);
    }
}

// New helper function to calculate read time
function calculateReadTime(content) {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
}

// Helper functions
function getAllMarkdownFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files.push(...getAllMarkdownFiles(fullPath));
        } else if (item.name.endsWith('.md')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

function getOutputPath(markdownFile) {
    const relativePath = path.relative(BLOG_DIR, markdownFile);
    const htmlPath = relativePath.replace('.md', '.html');
    return path.join('src/pages/blogs', htmlPath);
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Set up file watcher with debouncing
const watcher = chokidar.watch(`${BLOG_DIR}/**/*.md`, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
        stabilityThreshold: 2000, // Wait 2 seconds after last change
        pollInterval: 100        // Poll every 100ms
    },
    interval: 1000,              // Poll interval for systems that need polling
    binaryInterval: 3000         // Poll interval for binary files
});

// Watch for file changes
watcher
    .on('add', path => {
        console.log(`New blog post detected: ${path}`);
        createBlogPage(path);
    })
    .on('change', path => {
        console.log(`Blog post updated: ${path}`);
        createBlogPage(path);

    })
    .on('unlink', path => {
        console.log(`Blog post removed: ${path}`);
        // Remove the corresponding HTML file
        const htmlFile = getOutputPath(path);
        if (fs.existsSync(htmlFile)) {
            fs.unlinkSync(htmlFile);
            console.log(`Removed HTML file: ${htmlFile}`);
        }
        updateBlogsListing();
    });

console.log('Watching for blog changes...'); 