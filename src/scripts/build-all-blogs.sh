#!/bin/bash

# Directory containing markdown files
CONTENT_DIR="src/content/blogs"

# Output directory for HTML files
OUTPUT_DIR="src/pages/blogs"

# Find all markdown files and process them
find "$CONTENT_DIR" -name "*.md" | while read -r file; do
    # Get relative path and create corresponding output path
    rel_path="${file#$CONTENT_DIR/}"
    base_name="${rel_path%.md}"
    output_file="$OUTPUT_DIR/${base_name}.html"
    
    # Create output directory if it doesn't exist
    mkdir -p "$(dirname "$output_file")"
    
    # Build the blog post
    npm run build-blog "$file" "$output_file"
    
    echo "Built: $file -> $output_file"
done 