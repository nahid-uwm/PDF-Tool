You are a principal product manager, UX architect, and senior full-stack engineer. Design and build a production-grade web app/PWA for PDF merging, splitting, organizing, and converting many file types into PDF.

The product must be BETTER than typical online PDF tools. It must feel polished, fast, visual, privacy-first, and complete. Do not create a watered-down demo. Create a real product spec and implementation-ready plan with detailed UX, features, flows, edge cases, processing rules, and system behavior.

PRODUCT SUMMARY
Build a no-login, no-auth, no-account PDF tool suite with these pillars:
1. Convert many file types into PDF
2. Upload multiple PDFs and merge them
3. Visually organize files and pages before merge
4. Split PDFs in many different ways
5. Add page numbers, headers/footers, watermarks, bookmarks, and table of contents
6. Provide easy PDF navigation and preview
7. Work without user login, registration, or account creation
8. Be secure, private, fast, and mobile-friendly
9. Support batch workflows and mixed file uploads
10. Outperform common market tools in flexibility and UX

NON-NEGOTIABLE RULES
- No user login, signup, auth, paywall, or required email capture
- Anonymous guest workflow only
- Privacy-first: temporary processing, easy delete, automatic cleanup
- Support mixed-file upload in one workflow
- Support both full-document and page-level operations
- All major actions must have visual preview before export
- Must be accessible and keyboard-usable
- Must work well on desktop first, but also be usable on mobile/tablet
- Must have clear progress reporting, error handling, and retry behavior
- Must preserve document quality as much as possible
- Never execute document macros or active content
- Use safe sandboxed conversion pipelines

PRIMARY USER FLOWS
A. Mixed-file to PDF merge flow
- User drags in a mixture of PDF, DOCX, PPTX, XLSX, TXT, images, EPUB, HTML, etc.
- System identifies each file type
- Non-PDF files are converted to PDF in the background
- User sees a conversion queue with status for each file
- User gets a visual organizer with document cards and page thumbnails
- User sorts, filters, drags documents, reorders pages, inserts blank/separator/cover pages
- User optionally adds page numbers, TOC, bookmarks, headers/footers, watermark, compression, PDF/A
- User previews final result
- User downloads final merged PDF or ZIP if multiple outputs are generated

B. PDF split flow
- User uploads one or many PDFs
- System shows page thumbnails and outline/bookmarks
- User chooses one or more split modes
- User previews resulting output groups
- User exports individual PDFs or ZIP bundle

C. Convert-to-PDF flow
- User uploads supported files
- User selects conversion options when relevant
- System converts each file to PDF
- User can optionally merge converted results into one PDF
- User can optionally add OCR, page numbers, bookmarks, TOC, and navigation aids

D. Organize-only flow
- User uploads existing PDFs
- User rearranges, rotates, deletes, duplicates, extracts, inserts, or normalizes pages
- User exports reorganized PDF without needing merge or conversion

SUPPORTED INPUT FILE TYPES
Define support in 3 levels: Core, Extended, Experimental.

1. CORE INPUT TYPES
PDF:
- .pdf

Text / document formats:
- .docx
- .doc
- .odt
- .rtf
- .txt
- .md
- .markdown
- .html
- .htm
- .mht
- .mhtml

Spreadsheet formats:
- .xlsx
- .xls
- .ods
- .csv
- .tsv

Presentation formats:
- .pptx
- .ppt
- .odp
- .pps
- .ppsx

Image formats:
- .jpg
- .jpeg
- .png
- .gif
- .bmp
- .tif
- .tiff
- .webp
- .svg
- .heic
- .avif
- .ico

Fixed-layout / ebook / document formats:
- .epub
- .xps
- .oxps
- .djvu

2. EXTENDED INPUT TYPES
- .pub
- .vsd
- .vsdx
- .vss
- .vst
- .eml
- .msg
- .mbox
- .xml
- .fodt
- .fods
- .fodp
- .ott
- .ots
- .otp
- .dot
- .dotx
- .dotm
- .xlsm
- .xlt
- .xltx
- .xltm
- .pptm
- .pot
- .potx
- .potm
- .ppsm
- .odg
- .odf
- .fb2

3. EXPERIMENTAL / BUNDLE INPUTS
- .zip containing supported files and folders
- URL input for webpage-to-PDF
- pasted HTML or markdown text
- clipboard image paste
- folder upload from device

FILE HANDLING RULES BY TYPE
1. PDF handling
- Load as-is with page thumbnails
- Detect page count, dimensions, orientation, bookmarks, metadata, forms, annotations, attachments if present
- Preserve links and bookmarks by default
- Offer flattening option for forms/annotations
- Offer password prompt for protected PDFs
- Attempt repair for damaged xref/table structure when possible
- Detect scanned PDFs and offer OCR
- Detect mixed page sizes and offer normalization
- Detect empty or duplicate pages and suggest cleanup

2. Word-processing documents
Applies to DOCX, DOC, ODT, RTF, TXT, MD, HTML, HTM, MHT, MHTML, XML text-like files
- Convert to paginated PDF
- Preserve headings, paragraph structure, tables, lists, page breaks, hyperlinks, images, footnotes when possible
- Extract heading hierarchy to build bookmarks and optional TOC
- Convert markdown and HTML with clean styling and printable layout
- TXT must support monospace and wrapped layout options
- For DOC/DOCX/ODT, do not execute macros or embedded scripts
- Missing fonts should use fallback fonts and report substitutions
- Support page size selection: A4, Letter, Legal, custom
- Support margins, orientation, headers/footers, and print CSS where applicable

3. Spreadsheet handling
Applies to XLSX, XLS, ODS, CSV, TSV
- Let user choose:
  - all sheets
  - selected sheets
  - one PDF per sheet
  - one combined PDF
- Preserve print area when defined
- Offer fit modes:
  - actual size
  - fit sheet to one page
  - fit all columns to one page
  - fit rows by height
- Offer repeated header rows/columns
- Auto-detect landscape when beneficial
- Hidden sheets excluded by default, with toggle to include
- CSV/TSV should allow delimiter, encoding, header-row, and page layout settings
- Generate bookmarks by sheet name
- Option to insert sheet index page before content

4. Presentation handling
Applies to PPTX, PPT, ODP, PPS, PPSX
- Default to one slide per page
- Support handout layouts: 2, 3, 4, 6, or 9 slides per page
- Optional speaker notes rendering
- Preserve slide order, theme, embedded images, charts, and text
- Option to add slide titles as PDF bookmarks
- Option to include black/hidden slides
- Option to scale slides to fit page with margins
- Option to convert each deck to one PDF or split per slide/section

5. Image handling
Applies to JPG, JPEG, PNG, GIF, BMP, TIFF, WEBP, SVG, HEIC, AVIF, ICO
- Each image can become:
  - one PDF page
  - multiple images per page
  - contact sheet
  - poster-style split across pages
- Respect EXIF orientation
- Support image background fill, centering, crop-to-fit, fit-within, bleed, and border
- TIFF multipage should become multipage PDF
- SVG should preserve vector quality when possible
- Offer OCR for text-heavy images
- Offer scan cleanup: deskew, de-noise, crop, contrast, background whitening, dewarp

6. EPUB / HTML / URL handling
- Render via print engine suitable for web content
- Preserve internal links when possible
- Generate bookmarks from headings h1/h2/h3 or EPUB TOC/nav
- Support print CSS, page size, margins, header/footer, page numbers
- For long web pages, split into paginated PDF with proper margins and page breaks
- Offer “reader mode” cleanup for cluttered webpages
- Allow user to choose whether to include background colors/images

7. Fixed-layout and specialty formats
EPUB, XPS, OXPS, DJVU, PUB, VSD/VSDX, email files
- Convert to PDF while preserving fixed layout when possible
- For EML/MSG/MBOX:
  - render email headers (From, To, CC, Subject, Date)
  - render body
  - preserve inline images
  - optionally append attachments as appendix pages if convertible
- For PUB and Visio-like files:
  - render pages/diagrams to PDF
  - preserve page order
  - preserve vector output where possible
- Unsupported specialty cases must degrade gracefully with precise reason messaging

8. ZIP and folder handling
- Recursively inspect contents
- Load supported files only
- Ignore system junk files
- Show a pre-import summary:
  - supported files
  - unsupported files
  - duplicates
  - estimated page count
- Preserve folder ordering as optional initial sort mode
- Allow import of entire bundle as separate documents or as one combined workflow

UNSUPPORTED FILE BEHAVIOR
- Show unsupported files clearly
- For each unsupported file show:
  - filename
  - detected MIME/type
  - why unsupported
  - whether conversion plugin/module is missing
- Do not fail the whole batch because of one unsupported file
- Let user continue with supported files
- Generate an import report

MERGE FEATURES
The merge feature must be unusually strong.

1. Mixed input merge
- Allow merging PDFs with converted non-PDF files in the same session
- Preserve original file labels
- Show each source file as a card with:
  - thumbnail preview
  - filename
  - extension/type
  - size
  - page count
  - conversion status
  - OCR status
  - bookmark availability
  - page dimensions
  - last modified date if available

2. Visual organizer
- Main organizer must support:
  - document-card view
  - page-thumbnail view
  - compact list view
- Drag entire documents to reorder
- Expand a document and drag individual pages into new positions
- Drag pages between different source documents
- Multi-select pages using shift/cmd/ctrl
- Right-click or action menu for page/document operations
- Undo/redo history for all organization actions

3. Sorting and filtering
Predefined sort modes:
- upload order
- filename A-Z / Z-A
- file size small-large / large-small
- page count low-high / high-low
- file type
- last modified newest-oldest / oldest-newest
- page orientation
- page size
- color vs grayscale
- OCR completed vs not
- bookmark available vs not
Filters:
- by file type
- by page size
- by orientation
- by OCR status
- by scanned vs digital PDF
- by encrypted vs normal
- by pages with annotations/forms
- by document tag/group

4. Merge modes
- Standard append merge
- Merge only selected page ranges from each source
- Alternate/interleave pages from multiple documents
- Merge by chapter/bookmark groups
- Merge into sections with divider pages
- Merge with inserted blank pages to force duplex printing alignment
- Merge with automatic cover page
- Merge with generated title page from file list

5. Page operations before merge
- rotate selected pages
- delete pages
- duplicate pages
- extract pages into new mini-document
- insert blank page
- insert image page
- insert generated text page
- split spreads into two pages
- crop selected pages
- normalize page size
- center content
- add margins
- convert color to grayscale
- compress oversized image pages
- remove blank pages
- remove duplicate pages based on visual hash and text similarity

6. Merge output options
- Preserve bookmarks from source PDFs
- Rebuild bookmarks from:
  - source filenames
  - source bookmark trees
  - headings from converted docs
  - spreadsheet sheet names
  - presentation slide titles
- Generate a hierarchical table of contents page
- Add clickable TOC links to sections
- Add page numbers with custom format
- Add Bates numbering
- Add headers and footers
- Add watermark or stamp
- Set document metadata:
  - title
  - author
  - subject
  - keywords
- Output presets:
  - standard PDF
  - web-optimized / linearized PDF
  - PDF/A archival PDF
  - print-ready high-quality PDF
  - compressed low-size PDF
- Optional flatten final output
- Optional password protect final output

TABLE OF CONTENTS / BOOKMARKS / NAVIGATION
This is a key differentiator.

1. Automatic TOC generation
- Generate TOC from:
  - source filenames
  - source bookmark trees
  - heading styles detected in documents
  - EPUB nav/TOC
  - spreadsheet sheet names
  - presentation slide titles or section names
- Allow manual editing of TOC item text
- Allow hierarchy levels
- Allow page-number alignment and dotted leaders
- TOC must be optionally clickable
- Let user insert TOC:
  - at beginning
  - after cover
  - before each section
- Allow “regenerate after reordering”

2. Bookmark management
- Show bookmark tree in side panel
- Allow rename, reorder, indent/outdent, delete, and create bookmarks
- Allow bookmark generation from selected pages
- Allow auto-bookmark from OCR heading detection
- Allow merge-bookmarks strategy:
  - keep all
  - flatten one level
  - nest by source file
  - create fresh bookmark tree only

3. Easy PDF navigation
- Built-in viewer must include:
  - page thumbnails
  - bookmark/outline panel
  - page number jump
  - zoom
  - fit width
  - fit page
  - continuous scroll
  - single-page mode
  - search in text/OCR layer
  - rotate view
  - keyboard shortcuts
  - current section indicator
- Clicking TOC/bookmarks navigates live preview instantly

PAGE NUMBERING / HEADERS / FOOTERS / WATERMARKS
- Add page numbers to all pages or selected ranges
- Format examples:
  - 1, 2, 3
  - Page 1 of 40
  - A-001, A-002
  - Roman numerals for front matter + Arabic for body
- Position:
  - header/footer
  - left/center/right
  - inside/outside mirrored margins
- Styling:
  - font
  - size
  - opacity
  - color
  - margin offsets
- Skip numbering on cover/TOC/custom ranges
- Support section-based numbering restarts
- Support Bates numbering for legal/business use
- Headers/footers may include:
  - filename
  - section title
  - date/time
  - custom text
  - dynamic page count
- Watermarks:
  - text or image
  - repeated or single
  - diagonal/horizontal
  - opacity, scale, rotation
  - first page only / all pages / selected ranges

SPLIT FEATURES
Must support many split modes, not just page ranges.

1. Split modes
- custom page ranges
- every N pages
- odd pages / even pages
- each page as a separate PDF
- equal parts by number of files
- split by bookmark/outlines
- split by top-level sections only
- split by blank pages
- split by barcode or QR separator pages
- split by approximate target file size
- split by page labels
- split by selected pages
- split duplex scans into left/right halves
- split spreads into separate pages before export

2. Split preview
- Visual preview of resulting groups
- Each output group shows:
  - file name preview
  - page count
  - first-page thumbnail
  - estimated size
- User can merge neighboring groups before export
- User can rename individual output files

3. Split naming templates
Allow tokens such as:
- {original_name}
- {index}
- {range}
- {bookmark}
- {date}
- {sheet}
- {section}
- {page_start}
- {page_end}
Examples:
- contract_part_{index}
- report_{range}
- handbook_{bookmark}
- scan_{date}_{index}

4. Split export options
- separate PDFs
- single ZIP archive
- optional CSV/JSON manifest describing outputs
- preserve bookmarks inside child documents where relevant
- optional page numbers in split outputs
- optional OCR before split

OCR AND SCAN IMPROVEMENT
- OCR optional for PDFs and images
- Multi-language OCR support
- Searchable text layer output
- Keep original image layer plus invisible text layer
- Scan cleanup pipeline:
  - deskew
  - orientation detection
  - crop borders
  - background cleanup
  - denoise
  - contrast enhancement
  - dewarp
  - remove punch holes if possible
- OCR confidence summary
- Flag low-confidence pages
- Allow re-run OCR on selected pages only
- Detect headings from OCR text to build bookmarks/TOC
- Detect blank pages more intelligently after cleanup

VIEWER / ORGANIZER UI
Design a premium visual UI.

1. Layout
- Left sidebar: sources, filters, outline/bookmarks, job queue
- Center: large page/document canvas with thumbnails and live preview
- Right sidebar: context inspector for selected file/page/output settings
- Top toolbar: import, convert, merge, split, page operations, search, zoom, undo/redo, export
- Bottom status bar: total files, total pages, estimated size, selected items, processing status

2. Interactions
- drag and drop files anywhere
- paste from clipboard
- reorder by drag
- shift-select page ranges
- keyboard shortcuts for common actions
- resizable panels
- sticky export bar
- instant preview updates after edits
- confirmation only for destructive actions
- autosave current anonymous session locally in browser until tab/session expires

3. Mobile / tablet behavior
- simplified card layout
- bottom sheet for actions
- thumbnail scroller
- touch-friendly drag handles
- essential merge/split flows must still work

PRIVACY, SECURITY, AND NO-AUTH UX
- No signup, no auth, no personal account system
- Show a simple privacy note:
  - files are temporary
  - deleted automatically after short retention window
  - can be deleted immediately by user
- Use anonymous job IDs only
- Passwords for encrypted PDFs must be kept in memory only
- Disable macros and active content
- Sanitize filenames and metadata where necessary
- Isolate converters in workers/containers
- Rate-limit anonymous abuse without requiring account creation
- Optional local-only mode for simple PDF operations
- Manual “Delete all files now” button
- Automatic cleanup after inactivity and after completed download
- Never expose one anonymous user’s files to another

QUALITY AND OUTPUT OPTIONS
- Preserve vector quality when possible
- Embed fonts where permitted
- Preserve hyperlinks
- Preserve annotations optionally
- Preserve AcroForm fields optionally, or flatten them
- Detect digital signatures and warn before modifying signed documents
- Support PDF version selection if needed
- Support PDF/A validation mode
- Support PDF/UA-oriented checks where feasible
- Support web-optimized linearized output
- Compression controls:
  - no compression
  - balanced
  - strong compression
  - grayscale conversion
  - downsample images to selected DPI
- Offer output comparison preview:
  - original vs processed
  - page count changes
  - size before/after

ADVANCED DIFFERENTIATORS
Include features that beat common competitors:
- Mixed-file merge in one pipeline, not only PDF-to-PDF
- Page-level drag between documents
- Smart TOC generation from filenames, headings, bookmarks, sheets, or slide titles
- Split by bookmarks, blank pages, barcode separators, or target file size
- Duplicate-page detection and blank-page cleanup
- PDF repair attempt before fail
- Section-aware page numbering
- Cover page and divider page generator
- Batch recipes/presets:
  - “Merge monthly statements”
  - “Split scan by blank pages”
  - “Convert folder to PDFs”
  - “Create binder with TOC”
- ZIP/folder intake
- Local-first mode for privacy
- Session restore after accidental refresh
- Output manifest/report
- Accessibility-minded final PDFs where possible
- Archival mode with PDF/A validation report
- One-click “Normalize all documents” option
- Automatic bookmarks from OCR headings

ERROR HANDLING
For every failed file or operation:
- show exact file
- show readable cause
- show whether retry is possible
- show fallback option
- let other files continue
Common error cases:
- encrypted file without password
- corrupted file
- unsupported format
- missing converter plugin
- timeout
- out-of-memory
- font substitution
- OCR language missing
- too-large upload
- blocked active content
- signed PDF modification warning
- page-size normalization conflict

PERFORMANCE REQUIREMENTS
- Handle large multi-file sessions
- Stream uploads where possible
- Parallelize conversion jobs safely
- Show per-file and overall progress
- Cancel individual jobs
- Retry failed conversions
- Avoid blocking UI during heavy tasks
- Cache intermediate converted PDFs only for current anonymous session
- Use thumbnail generation lazily for huge files
- Support batch export without freezing browser

ACCESSIBILITY REQUIREMENTS
- WCAG 2.2 AA target
- Full keyboard navigation
- Screen-reader labels on all controls
- Strong focus states
- Sufficient contrast
- Accessible drag-and-drop alternatives via move up/down controls
- Announce progress and completion states
- Accessible error summaries

RECOMMENDED TECHNICAL APPROACH
Use the best tool for each job instead of one weak converter for everything:
- PDF viewer/navigation: PDF.js-based viewer
- PDF structural operations: robust PDF library/tooling suitable for merge, split, rotate, extract, repair, metadata, bookmarks
- Office conversion: LibreOffice headless or equivalent high-fidelity engine
- Markdown/text conversion: Pandoc or equivalent for structured text formats
- HTML/URL rendering: Chromium/headless browser print engine
- Image conversion and cleanup: ImageMagick or equivalent
- OCR/searchable PDFs: Tesseract or equivalent OCR engine
- Validation: PDF/A and PDF/UA-oriented validation tooling such as veraPDF-compatible workflow
- Use worker queue / job pipeline for conversion and OCR
- Sandbox each conversion path
- Prefer client-side processing for simple PDF-only operations when practical

DATA / SESSION MODEL
No user accounts. Use anonymous session model:
- session_id
- file_id
- job_id
- operation history
- temporary output references
- expiration timestamp
- local browser state for unsaved organizer changes
Include cleanup scheduler and explicit delete endpoints/actions.

API / SERVICE BEHAVIOR
Design internal or external APIs for:
- upload/import
- file inspection
- convert to PDF
- merge
- split
- page operations
- OCR
- bookmark/TOC generation
- export/download
- delete/cleanup
- job progress polling or websocket updates

DELIVERABLES YOU MUST PRODUCE
Produce a complete output with these sections:
1. Product requirements document
2. Full feature matrix
3. Supported file-type matrix with handling rules and edge cases
4. Detailed UX and screen-by-screen flow
5. Information architecture and component list
6. Processing pipeline and technical architecture
7. Data/session model for no-auth workflow
8. Error-state handling matrix
9. Security/privacy model
10. Accessibility checklist
11. Acceptance criteria and QA scenarios
12. Suggested implementation phases:
   - MVP
   - V2
   - power-user/advanced
13. Clear recommendations for which features are core vs optional
14. Final polished product positioning and value proposition

ACCEPTANCE TEST SCENARIOS
The final design must pass these example scenarios:
- Upload 20 mixed files including PDF, DOCX, PPTX, XLSX, TXT, PNG and merge into one organized PDF
- Drag page 3 of one source document between pages 8 and 9 of another
- Sort files by size, then manually override order by drag
- Split a 400-page scan by blank pages
- Split a handbook by top-level bookmarks
- Add cover page, TOC, page numbers, and footer to merged result
- Convert scanned images into searchable PDFs with OCR
- Import a ZIP of mixed office files and convert only supported ones
- Handle a password-protected PDF gracefully
- Detect signed PDF and warn before altering it
- Recover from one failed conversion without losing the rest of the batch
- Export final result as PDF/A and provide validation/report summary
- Use product fully without creating an account

OUTPUT STYLE
Be extremely specific. Do not give generic advice. Do not omit edge cases. Do not simplify the feature list. Write as a serious production product spec that a team can immediately build from.