import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0284C7"))
        
        # Header
        self.drawString(54, 755, "WEBHEALTH — MICROSOFT AZURE CLOUD IMPLEMENTATION SPECIFICATION")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(558, 755, "Decoupled Production Architecture")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 747, 558, 747)
        
        # Footer
        self.line(54, 45, 558, 45)
        self.drawString(54, 32, "Cloud-Based Dead Link Detection & Website Health Monitoring System")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_str)
        self.restoreState()

def create_azure_pdf(output_filename="Azure_WebHealth_Implementation_Report.pdf"):
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#0284C7"),
        spaceAfter=10
    )
    
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=10,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155"),
        spaceAfter=4
    )
    
    bullet_style = ParagraphStyle(
        'BulletText',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    story = []

    # Title Banner
    story.append(Paragraph("WebHealth Cloud Architecture & Technical Verification", title_style))
    story.append(Paragraph("<b>Implementation Report:</b> Fully Decoupled Microsoft Azure Microservices Pipeline", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284C7"), spaceAfter=10))

    # 1. Executive Summary
    story.append(Paragraph("1. Executive Summary & Verification Overview", h1_style))
    story.append(Paragraph(
        "<b>WebHealth</b> is an enterprise distributed dead link detection and website health monitoring platform deployed on <b>Microsoft Azure</b>. "
        "The architecture adheres strictly to cloud microservice principles: the API layer is fully decoupled from crawler execution and parallel worker verification. "
        "Independent <b>Azure Functions workers</b> pull tasks asynchronously from <b>Azure Service Bus</b>, execute multi-tier HTTP probes, and idempotently persist structured telemetry in <b>Azure Cosmos DB</b>.",
        body_style
    ))

    # 2. What Has Been Completed & Verified
    story.append(Paragraph("2. Implemented Features & Technical Verifications", h1_style))
    story.append(Paragraph("• <b>Independent Worker Component:</b> Worker logic extracted into a standalone deployable Azure Function (<code>worker/</code>) using Node.js v4 programming model with native Service Bus queue triggers.", bullet_style))
    story.append(Paragraph("• <b>Non-Blocking Job-Based API:</b> <code>POST /api/scan</code> creates the scan job in Cosmos DB, validates input, and returns <code>HTTP 202 Accepted</code> with <code>scanId</code> immediately. Crawling and task dispatch run in detached background execution.", bullet_style))
    story.append(Paragraph("• <b>Dual-Scope Link Detection:</b> Recursively crawls internal HTML pages (depth 1–4), while extracting and verifying both <b>internal</b> and <b>external</b> destination links.", bullet_style))
    story.append(Paragraph("• <b>Standardized Link Classification:</b> Enforces strict status categories: <code>WORKING</code> (2xx), <code>REDIRECT</code> (3xx with target URL tracking), <code>BROKEN</code> (4xx, 5xx, host connection errors), and <code>TIMEOUT</code> (10s threshold).", bullet_style))
    story.append(Paragraph("• <b>Cosmos DB Partitioning & Idempotency:</b> Container <code>scans</code> partitioned on <code>/id</code>; container <code>links</code> partitioned on <code>/scanId</code>. Link document IDs use deterministic SHA-256 hashing (<code>sha256(scanId + url)</code>) to prevent duplicate records during retries.", bullet_style))
    story.append(Paragraph("• <b>Atomic Completion Tracking:</b> Atomic counters for <code>totalLinks</code> and <code>processedLinks</code>; transitions state to <code>COMPLETED</code> when all links finish, dynamically computing health score and P50/P95 latency percentiles.", bullet_style))
    story.append(Paragraph("• <b>Application Insights & Observability:</b> Wired <code>applicationinsights</code> SDK with automatic request, dependency, and console collection, attaching custom dimensions (<code>scanId</code>, <code>latencyMs</code>) for Log Analytics.", bullet_style))
    story.append(Paragraph("• <b>SSRF Security Guard:</b> Added <code>ssrfGuard.js</code> validating all user URLs against private IP ranges (<code>10.0.0.0/8</code>, <code>172.16.0.0/12</code>, <code>192.168.0.0/16</code>, <code>127.0.0.1</code>) and cloud metadata services (<code>169.254.169.254</code>).", bullet_style))
    story.append(Paragraph("• <b>Transparent Environment Modes:</b> Explicit high-visibility UI banner displaying <b>SANDBOX EMULATION MODE (OFFLINE)</b> vs. <b>LIVE MICROSOFT AZURE CLOUD (PRODUCTION)</b>.", bullet_style))
    story.append(Paragraph("• <b>Unified Infrastructure Script & CI/CD:</b> <code>deploy_azure.ps1</code> provisions App Service, Function App, Service Bus with Dead-Letter Queue (DLQ=5), Cosmos DB, Application Insights, and Key Vault. Two independent GitHub Actions workflows deploy API and Worker.", bullet_style))

    story.append(Spacer(1, 6))

    # 3. Azure Services Table
    story.append(Paragraph("3. Microsoft Azure Service Mapping", h1_style))
    
    table_data = [
        [
            Paragraph("<b>Component Role</b>", body_style),
            Paragraph("<b>Microsoft Azure Service</b>", body_style),
            Paragraph("<b>Architecture Implementation Details</b>", body_style)
        ],
        [
            Paragraph("<b>API & Web Host</b>", body_style),
            Paragraph("Azure App Service (Linux Node 20)", body_style),
            Paragraph("Hosts React SPA and Express REST API; validates SSRF guard and exposes <code>/health</code> liveness probe.", body_style)
        ],
        [
            Paragraph("<b>Asynchronous Queue</b>", body_style),
            Paragraph("Azure Service Bus", body_style),
            Paragraph("Queue: <code>dead-link-tasks</code>. Max delivery count: 5; dead-lettering enabled for poisoned messages.", body_style)
        ],
        [
            Paragraph("<b>Parallel Workers</b>", body_style),
            Paragraph("Azure Functions (Consumption)", body_style),
            Paragraph("Standalone serverless worker triggered by Service Bus; executes HEAD/GET probes and measures latency.", body_style)
        ],
        [
            Paragraph("<b>NoSQL Database</b>", body_style),
            Paragraph("Azure Cosmos DB (NoSQL API)", body_style),
            Paragraph("Database: <code>webhealth-db</code>. Container <code>scans</code> (PK: <code>/id</code>) & <code>links</code> (PK: <code>/scanId</code>).", body_style)
        ],
        [
            Paragraph("<b>Monitoring & Logs</b>", body_style),
            Paragraph("Application Insights & Log Analytics", body_style),
            Paragraph("Captures traces with custom dimension <code>scanId</code>; alert trigger on Dead-Letter Queue &gt; 0.", body_style)
        ],
        [
            Paragraph("<b>Secrets Storage</b>", body_style),
            Paragraph("Azure Key Vault", body_style),
            Paragraph("Stores Service Bus and Cosmos DB credentials securely via Key Vault reference syntax.", body_style)
        ]
    ]

    t = Table(table_data, colWidths=[110, 150, 244])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t)

    story.append(Spacer(1, 8))

    # 4. Multi-Cloud Comparison
    story.append(Paragraph("4. Multi-Cloud Parity Matrix", h1_style))
    
    matrix_data = [
        [Paragraph("<b>Role</b>", body_style), Paragraph("<b>AWS Equivalent</b>", body_style), Paragraph("<b>GCP Equivalent</b>", body_style), Paragraph("<b>Azure Implementation (WebHealth)</b>", body_style)],
        [Paragraph("API / Entry", body_style), Paragraph("API Gateway / App Runner", body_style), Paragraph("Cloud Run", body_style), Paragraph("<b>Azure App Service</b>", body_style)],
        [Paragraph("Message Queue", body_style), Paragraph("Amazon SQS (DLQ)", body_style), Paragraph("Cloud Pub/Sub", body_style), Paragraph("<b>Azure Service Bus (Queue + DLQ)</b>", body_style)],
        [Paragraph("Serverless Workers", body_style), Paragraph("AWS Lambda (SQS Trigger)", body_style), Paragraph("Cloud Run Worker", body_style), Paragraph("<b>Azure Functions (Service Bus Trigger)</b>", body_style)],
        [Paragraph("Document Database", body_style), Paragraph("Amazon DynamoDB", body_style), Paragraph("Cloud Firestore", body_style), Paragraph("<b>Azure Cosmos DB (NoSQL API)</b>", body_style)],
        [Paragraph("Observability", body_style), Paragraph("CloudWatch Logs & Metrics", body_style), Paragraph("Cloud Logging", body_style), Paragraph("<b>Application Insights & Log Analytics</b>", body_style)]
    ]
    
    t_matrix = Table(matrix_data, colWidths=[90, 130, 120, 164])
    t_matrix.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_matrix)

    story.append(Spacer(1, 8))

    # 5. Pipeline Step-by-Step
    story.append(Paragraph("5. End-to-End Processing Flow", h1_style))
    story.append(Paragraph(
        "1. <b>Client Submission & SSRF Validation:</b> React frontend submits target URL. The API runs <code>validateTargetUrl()</code> blocking loopback and private subnets.<br/>"
        "2. <b>Job Ingestion:</b> Scan document created in Cosmos DB with <code>INITIALIZING</code>. HTTP 202 is returned immediately.<br/>"
        "3. <b>Background Crawler:</b> Cheerio parses internal links up to max depth, normalizes URLs, and sets <code>totalLinks</code>.<br/>"
        "4. <b>Batch Enqueueing:</b> Discovered links are submitted to Azure Service Bus queue <code>dead-link-tasks</code> in batches.<br/>"
        "5. <b>Functions Worker Execution:</b> Azure Function instances trigger on queue messages, execute HTTP HEAD/GET probes, and measure latency.<br/>"
        "6. <b>Idempotent Upsert & Atomic Counter:</b> Worker upserts link record with <code>id = sha256(scanId + url)</code> into Cosmos DB and increments <code>processedLinks</code>.<br/>"
        "7. <b>Completion & Reporting:</b> When <code>processedLinks == totalLinks</code>, status switches to <code>COMPLETED</code>. Frontend polling renders score, latency charts, and CSV/JSON export.",
        body_style
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated updated {output_filename}")

if __name__ == "__main__":
    create_azure_pdf()
