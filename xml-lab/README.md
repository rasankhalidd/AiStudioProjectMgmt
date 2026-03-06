# XML Lab

## Purpose

This lab demonstrates understanding of XML structure, XML Schemas (XSD), and XML data modeling. It covers how to define entity structures using tree diagrams, enforce structure with schemas, and create valid XML documents with sample data.

## Files

| File | Description |
|------|-------------|
| `tree_structures.md` | Visual hierarchical tree diagrams for both Customer and Staff entities |
| `customer_schema.xsd` | XML Schema (XSD) defining the structure and data types for the Customer entity |
| `staff_schema.xsd` | XML Schema (XSD) defining the structure and data types for the Staff entity |
| `customer.xml` | Sample XML document for a Customer, validated against `customer_schema.xsd` |
| `staff.xml` | Sample XML document for a Staff member, validated against `staff_schema.xsd` |

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
