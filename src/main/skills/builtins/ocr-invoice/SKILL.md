---
name: ocr-invoice
description: Extract structured fields from invoices (PDF / image) and build a reimbursement sheet
version: 1.0.0
author: opendesk-team
tags: [finance, ocr, invoice, automation, excel]
---

## Instructions

When the user asks you to process invoices for reimbursement, follow this structured approach.

### 1. Discover Input

- Use `file_list` / `desktop_*` tools to scan the target directory for invoices
- Supported formats: PDF, JPG, PNG, HEIC, TIFF
- Group by apparent project / month / person based on filenames or content

### 2. Extract Fields

For every invoice, extract these fields (use `file_read` for PDFs and OCR tools for images):

| Field | Type | Notes |
|-------|------|-------|
| `invoiceNo` | string | 发票号码 |
| `invoiceDate` | ISO date | 开票日期 |
| `vendorName` | string | 销售方名称（抬头） |
| `vendorTaxId` | string | 销售方税号 |
| `buyerName` | string | 购买方名称 |
| `buyerTaxId` | string | 购买方税号 |
| `amount` | decimal | 价税合计 (¥) |
| `amountWithoutTax` | decimal | 不含税金额 |
| `taxAmount` | decimal | 税额 |
| `taxRate` | string | 税率（如 "6%", "13%"） |
| `category` | enum | 餐饮 / 交通 / 住宿 / 办公 / 其他 |
| `sourceFile` | path | 来源文件绝对路径 |

If a field cannot be read confidently, set it to `null` and add to a `low_confidence` list.

### 3. Categorise & Validate

- Group expenses by `category`
- Flag anomalies: missing tax ID, duplicate invoice number, amount > 10,000, dates outside the user's stated month
- Ask the user to confirm only when categories are unclear or amounts are unusually large

### 4. Produce Reimbursement Sheet

Generate a `.xlsx` file at the user's chosen path with these columns:
- 序号 / 日期 / 类别 / 销售方 / 税额 / 不含税金额 / 价税合计 / 发票号 / 来源文件（可点击的超链接）

Group rows by category with subtotals. Add a final summary row with grand total.

### 5. Output

- Show a summary table in chat (top 5 + grand total)
- Provide the xlsx file path
- Highlight any low-confidence or duplicate invoices for manual review

## Rules

- Always preserve the original invoice files; never delete or rename them
- If OCR confidence is low for any field, say so explicitly rather than guessing
- Reimbursement amounts must use Chinese 增值税 logic (含税 vs 不含税) — verify `amountWithoutTax + taxAmount == amount` for each row
- For duplicate invoice numbers, default to keeping the first occurrence and flagging the rest
- Do not invent data — if a field is unreadable, leave it blank and surface it to the user