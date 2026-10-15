# Review 1 Viva & Presentation Cheatsheet
## Cloud-Based Dead Link Detection and Website Health Monitoring System
**Google Cloud Platform Team**: Naghulan Sivamani R V (23z238) & Shreyaa S V (23z264)

---

## 🎤 1. Presentation Script (Slide by Slide)

### Slide 1: Title
> "Good morning / afternoon professors. We are presenting our project: Cloud-Based Dead Link Detection and Website Health Monitoring System. Our project is divided across two cloud providers: Amazon Web Services and Google Cloud Platform. Today, Shreyaa and I are presenting the Google Cloud Platform implementation."

### Slide 2: Problem Statement
> "Websites naturally evolve over time. Pages move, external resources disappear, or servers fail, leading to dead links or 404 errors. Manual verification of hundreds of links is slow, tedious, and error-prone. Our objective is to automate link discovery, asynchronously check their health at cloud scale, and generate an actionable Website Health Report."

### Slide 3 & 4: Proposed Solution & Activity Flow
> "Our solution operates in 7 clean steps:
> 1. User submits a target URL through the Web Frontend.
> 2. Cloud Run receives the scan job.
> 3. Cloud Run crawls the website and extracts all internal and external links.
> 4. Discovered links are placed into asynchronous processing tasks in Google Cloud Pub/Sub.
> 5. Serverless Cloud Run Workers check each link concurrently with latency profiling.
> 6. Results are saved into Cloud Firestore.
> 7. The Web Frontend renders the Website Health Report with radial health scores and recommendations."

### Slide 6: Google Cloud Architecture (The Core Diagram)
> "In Google Cloud, we have decoupled each stage for high elasticity and fault tolerance:
> - **Entry Point**: Cloud Run hosts our REST API and Web Crawler.
> - **Message Queue**: Cloud Pub/Sub decouples task discovery from verification.
> - **Workers**: Cloud Run Workers consume Pub/Sub tasks via Push Subscriptions.
> - **Database**: Cloud Firestore stores documents and subcollections.
> - **Monitoring**: Cloud Logging captures structured audit trails."

---

## 👨‍💻 2. Individual Responsibilities Breakdown (Slide 8)

### Naghulan's Part: Cloud Run, Workers and Link-Processing Logic
**When the professor asks you what you specifically built:**
> "My primary responsibility is the compute and link-processing engine:
> 1. **Cloud Run REST API & Crawler**: I implemented the web crawler using Node.js and Cheerio that visits the target domain up to configurable depth, parses anchor tags, normalizes relative URLs, and isolates internal vs external endpoints.
> 2. **Cloud Run Worker HTTP Engine**: I engineered the link verification service that issues HTTP HEAD requests (with GET fallback) to minimize bandwidth.
> 3. **Link Status Classifier**: I built the logic to categorize responses into Working (2xx), Redirected (301/302), Dead/Broken (4xx), Server Error (5xx), and Timeout.
> 4. **Latency Profiling**: I measured round-trip response time in milliseconds to detect slow endpoints."

### Shreyaa's Part: Pub/Sub, Firestore, Cloud Logging & GCP Testing
**When the professor asks Shreyaa what she specifically built:**
> "My primary responsibility is cloud messaging, storage, and observability:
> 1. **Cloud Pub/Sub Messaging**: I configured the `dead-link-tasks` topic and Push Subscription to distribute link checks to workers asynchronously, preventing timeout bottlenecks.
> 2. **Cloud Firestore Schema**: I designed the NoSQL schema with a root `scans` collection and nested `links` subcollections, and implemented atomic counter updates and health score calculations.
> 3. **Cloud Logging**: I integrated structured JSON logging to monitor service execution and track dead link events.
> 4. **Testing & Validation**: I evaluated the pipeline using our built-in testbed to verify accurate classification of 200, 301, 404, 500, and timeout statuses."

---

## ❓ 3. Likely Professor Viva Questions & Winning Answers

### Q1: Why did you use Pub/Sub instead of having Cloud Run check all links in a simple loop?
**Answer**:
> "If a website has 200 links and we check them sequentially with an average latency of 500ms, the request would take over 100 seconds, exceeding HTTP timeout limits and freezing the server. By publishing tasks to Google Cloud Pub/Sub, we decouple link discovery from link verification. Pub/Sub distributes the messages across concurrent Cloud Run workers that process dozens of links in parallel in under 5 seconds."

### Q2: Why did you choose Cloud Run instead of Google Compute Engine (VMs)?
**Answer**:
> "Compute Engine requires provisioning, managing OS patches, and paying for idle CPU 24/7. Cloud Run is completely serverless. It scales to zero when no scans are running (zero cost), and scales up instantly to thousands of container instances when large websites are scanned."

### Q3: How do you handle HTTP Redirects (301 vs 302)?
**Answer**:
> "We disable automatic redirect following on the initial HEAD request so we can inspect the `Location` response header. If status is 301 (Moved Permanently) or 302 (Found), we flag it as `REDIRECTED`, record the new destination URL, and advise the website owner in the Health Report to update their links to avoid unnecessary redirect hops."

### Q4: How is the Website Health Score calculated?
**Answer**:
> "Health Score is the percentage of healthy links relative to total checked links:
> $$\text{Health Score} = \left(\frac{\text{Working Links (2xx)} + \text{Valid Redirects (3xx)}}{\text{Total Verified Links}}\right) \times 100$$
> Scores $\ge 90\%$ receive Grade A+, $75-89\%$ Grade A, $60-74\%$ Grade B, and below 60% Grade F."

### Q5: How do AWS and GCP implementations compare? (Slide 7)
**Answer**:
> "Both architectures solve the exact same problem using serverless primitives:
> - AWS uses API Gateway + Lambda; GCP uses Cloud Run.
> - AWS uses Amazon SQS; GCP uses Cloud Pub/Sub.
> - AWS uses DynamoDB; GCP uses Cloud Firestore.
> - AWS uses CloudWatch; GCP uses Cloud Logging."
