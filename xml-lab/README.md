# XML Lab

## Purpose

This lab demonstrates understanding of XML structure, XML Schemas (XSD), and XML data modeling. It covers how to define entity structures using tree diagrams, enforce structure with schemas, and create valid XML documents with sample data.

## Files

| File | Description |
|------|-------------|
| `tree_structures.drawio` | draw.io diagram file with Customer (Page 1) and Staff (Page 2) tree structures — open in [draw.io](https://app.diagrams.net/) |
| `tree_structures.md` | ASCII hierarchical tree diagrams for both Customer and Staff entities |
| `customer_schema.xsd` | XML Schema (XSD) defining the structure and data types for the Customer entity |
| `staff_schema.xsd` | XML Schema (XSD) defining the structure and data types for the Staff entity |
| `customer.xml` | Sample XML document for a Customer, validated against `customer_schema.xsd` |
| `staff.xml` | Sample XML document for a Staff member, validated against `staff_schema.xsd` |

## How to Open the draw.io Diagram

The file `tree_structures.drawio` is a standard draw.io XML file. Choose **any one** of the three options below to view it.

### Option A — Browser (no install needed) ✅ Recommended

1. Go to **[https://app.diagrams.net/](https://app.diagrams.net/)** in your browser.
2. If a "Where do you want to store your diagram?" dialog appears, click **"Decide later"** or **"This device"**.
3. In the toolbar at the top of the page choose **File → Open from → This device…**
4. Navigate to your local copy of this repository, open the `xml-lab/` folder, and select **`tree_structures.drawio`**.
5. The diagram opens. Use the **page tabs at the bottom** to switch between the **Customer** and **Staff** diagrams.

> **Don't have a local copy?**  
> Open the file on GitHub (`xml-lab/tree_structures.drawio`), click the **"⋯" (More file actions)** button → **"Download"**, then follow steps 3–5 above with the downloaded file.

---

### Option B — VS Code (draw.io extension)

1. Install the **[Draw.io Integration](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio)** extension in VS Code.
2. Open the repository folder in VS Code.
3. In the Explorer panel, click on **`xml-lab/tree_structures.drawio`**.
4. The diagram renders directly inside VS Code — no browser needed.

---

### Option C — draw.io Desktop App

1. Download and install the draw.io desktop app from **[https://github.com/jgraph/drawio-desktop/releases](https://github.com/jgraph/drawio-desktop/releases)**.
2. Launch the app and choose **File → Open…**
3. Select **`tree_structures.drawio`** from your local `xml-lab/` folder.

---

## Entities

Both the **Customer** and **Staff** entities share the same structure:

- **ID** — Unique identifier (string)
- **Name** — Full name (string)
- **Address** — Nested element containing:
  - `Street` — Street address (string)
  - `Zip` — Postal/ZIP code (string)
- **DateOfBirth** — Date of birth (date, format: YYYY-MM-DD)
- **TelephoneNumber** — Nested element containing:
  - `WorkNumber` — Work phone number (string)
  - `MobileNumber` — Mobile phone number (string)

## Group Member

- Rasan Khalid
