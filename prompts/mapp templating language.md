# Mapp Engage Email Template Language: Complete Reference

---

## Overview

Mapp Engage email templates use a combination of **HTML**, **Velocity-like scripting**, and **special placeholders/functions** to enable dynamic, personalized, and modular email content.  
Templates are composed of **frameworks (layouts)**, **blocks (content modules)**, and **placeholders (dynamic fields)**.

---

## 1. Standard Fields & Placeholders

### User Fields (Standard Profile Attributes)

| Field Name | Syntax (Recommended) | Alternate Syntax | Example Output |
|-------------|----------------------|------------------|----------------|
| First Name | `<%${user['FirstName']}%>` | `<%user.firstname%>` | John |
| Last Name | `<%${user['LastName']}%>` | `<%user.lastname%>` | Doe |
| Email | `<%${user['Email']}%>` | `<%user.email%>` | john.doe@email.com |
| Title | `<%${user['Title']}%>` | `<%user.title%>` | Mr., Ms., Dr., etc. |
| Time Zone | `<%${user['TimeZone']}%>` | `<%user.timezone%>` | Europe/Berlin |
| ... | `<%${user['FieldName']}%>` | `<%user.fieldname%>` | (field value) |

### Custom Fields

| Field Name | Syntax (Recommended) | Alternate Syntax |
|-------------|----------------------|------------------|
| Custom Field | `<%${user.CustomAttribute['customfield']}%>` | `<%user.custom.customfield%>` |

### Member / Campaign Attributes

| Field Name | Syntax (Recommended) | Alternate Syntax |
|-------------|----------------------|------------------|
| Member Attr | `<%${user.MemberAttribute['LastPurchase']}%>` | `<%user.member.LastPurchase%>` |
| Campaign Attr | `<%${user.CampaignAttribute['industry']}%>` | `<%user.campaignattribute.industry%>` |

### Related Data

| Field Name | Syntax Example |
|-------------|----------------|
| Related Data | `<%${user.relatedAttribute['dataset']['column']}%>` |
| Related Data (unique) | `<%${ecx:related('dataset', 'key')['column']}%>` |
| Product Data | `<%${ecx:related('ProductCatalogue', ecx:related('Shop', 'Paris')['Product'])['Description']}%>` |

---

## 2. System Fields & Special Variables

| Variable Name | Description / Usage Example |
|----------------|------------------------------|
| `<%Unsubscribe%>` | Unsubscribe link (`<a href="<%Unsubscribe%>">Unsubscribe</a>`) |
| `<%ProfileEdit%>` | Link to profile edit page |
| `<%ReadMessageOnline%>` | View message online (HTML/Text) |
| `<%ReadMessageOnlineMobile%>` | View mobile version |
| `<%ForwardMessage%>` | Forward message via Mapp Engage |
| `<%InsertCSE id="12345"%>` | Content Store Element (e.g., image) |

**Reference:** System Links Documentation

---

## 3. Frameworks & Drop Zones

Frameworks define the overall structure and layout of your email.  
Drop zones (block areas) are placeholders where content blocks are inserted.

**Example:**

```html
$tplBlockArea.begin('{"name":"Main Content", "block-area-id":"main"}')
  <!-- Content blocks will be inserted here -->
$tplBlockArea.end()
```

**Best Practice:** Use semantic HTML and table-based layouts for maximum compatibility.

---

## 4. Blocks & Editable Fields

Blocks are reusable content modules (e.g., hero, product list, button).  
Each block can have marketer-editable fields using `tplPlaceholder.element`.

### Supported Editable Field Types

| Type | Description | Example |
|------|--------------|----------|
| text | Single/multi-line text | `{"type":"text"}` |
| image | Image upload/selection | `{"type":"image"}` |
| link | URL input | `{"type":"link"}` |
| boolean | Toggle (on/off) | `{"type":"boolean"}` |
| number | Numeric input | `{"type":"number"}` |
| select | Dropdown | `{"type":"select", "options":["A","B","C"]}` |
| list | List of items | `{"type":"list"}` |

**Example Block:**

```velocity
#set($Headline = $tplPlaceholder.element('{"name":"Headline Text", "type":"text", "value":"Welcome!"}'))
<h1>$Headline</h1>
```

---

## 5. Template Functions (ECX / ECM)

Functions enable dynamic content, formatting, and data access.

**Syntax:**

```html
<%${library:functionName(arguments)}%>
```

### Common ECX / ECM Functions

| Function | Description | Example |
|-----------|-------------|----------|
| `ecm:concat(a, b, ...)` | Concatenate strings | `<%${ecm:concat('Hi ', user.firstName)}%>` |
| `ecx:capitalizeFirstLetter(str)` | Capitalize first letter | `<%${ecx:capitalizeFirstLetter(user.firstName)}%>` |
| `ecx:capitalizeWords(text)` | Capitalize all words | `<%${ecx:capitalizeWords('hello world')}%>` |
| `ecx:formatDate(date, format, tz, lang, utc)` | Format a date | `<%${ecx:formatDate(user.birthDate, 'MMMM d, yyyy', ecm:timeZone('Europe/London'), 'en', false)}%>` |
| `ecx:formatNumber(num, decimals, dec, thou)` | Format a number | `<%${ecx:formatNumber(user.CustomAttribute['OrderTotal'], 2, ',', '.') }%>` |
| `ecx:filter(obj, column, operator, value)` | Filter dataset | `<%${ecx:filter(products, 'price', '>', 10)}%>` |
| `ecx:related(dataset, key)` | Related data lookup | `<%${ecx:related('Orders', user['Email'])['Total']}%>` |
| `ecx:productCatalog(sku, attr)` | Product attribute lookup | `<%${ecx:productCatalog('SKU123','productTitle')}%>` |
| `ecm:urlEncode(value)` | URL encode | `<%${ecm:urlEncode(user.Email)}%>` |
| `ecm:base64Encode(text)` | Base64 encode | `<%${ecm:base64Encode(user.Email)}%>` |
| `ecm:countMapElements(mapObject)` | Count elements | `<%${ecm:countMapElements(map)}%>` |

---

## 6. Control Structures

### If / Else

```html
<%If expression="${user.CustomAttribute['VIP'] == 'true'}"%>
  <p>Welcome, VIP!</p>
<%Else%>
  <p>Welcome, valued customer!</p>
<%/If%>
```

or (Velocity-style)

```velocity
#if($VIP == "true")
  <p>Dear valued customer, enjoy your VIP perks!</p>
#else
  <p>Join our VIP program for more perks.</p>
#end
```

### Loops

```html
<%ForEach var="product" items="${ecx:recommendedProducts('PRECALC', user.pk, '3', 500)}"%>
  <p><%${product.productName}%> - $<%${product.productPrice}%></p>
<%/ForEach%>
```

or

```velocity
#foreach($product in $productsList)
  <p>Item: $product.Name</p>
#end
```

### Macros

```velocity
#macro(productEntry $id)
  <div class="product">
    <p>Name: $ECX.getProductField($id,"Name")</p>
    <p>Price: $ECX.getProductField($id,"Price")</p>
  </div>
#end

#foreach($pid in $productIds)
  #productEntry($pid)
#end
```

---

## 7. Product Recommendations

```html
<%ForEach var="product" items="${ecx:recommendedProducts('PRECALC', user.pk, '3', 500)}"%>
  <div class="product">
    <img src="<%${product.productImageUrl}%>" alt="<%${product.productName}%>"/>
    <h3><%${product.productName}%></h3>
    <p>Price: $<%${product.productPrice}%></p>
    <a href="<%${product.productUrl}%>">View Product</a>
  </div>
<%/ForEach%>
```

**Parameters:**
- `'PRECALC'`: Recommendation algorithm or source  
- `user.pk`: User’s primary key  
- `'3'`: Number of products to recommend  
- `500`: Timeout in ms  

**Fallback Example:**

```html
<%If expression="${ecx:recommendedProducts('PRECALC', user.pk, '3', 500).size() == 0}"%>
  <p>No recommendations available at this time.</p>
<%/If%>
```

---

## 8. Error Handling & Fallbacks

```html
<%If expression="${user['FirstName'] == null}"%>
  <p>Hello, valued customer!</p>
<%Else%>
  <p>Hello, <%${user['FirstName']}%>!</p>
<%/If%>
```

---

## 9. Accessibility & Responsive Design

- Use semantic HTML (`<h1>`, `<p>`, `<ul>`, etc.)
- Always provide `alt` text for images.
- Use inline styles for critical formatting.
- Use media queries for mobile responsiveness.

```html
<style>
  .product { width: 100%; max-width: 300px; margin: auto; }
  @media (max-width:600px) {
    .product { max-width: 100%; }
  }
</style>
```

---

## 10. Testing & Debugging

- Preview with sample or mock user data.
- Check for unclosed tags and syntax errors (`%>`, `${}`).
- Test in all major clients (Gmail, Outlook, Apple Mail, mobile).
- Use defaults for missing/null data.

---

## 11. Best Practices

- ✅ Always use `<% ... %>` tags for placeholders.  
- ✅ Use bracket notation for clarity.  
- ✅ Wrap system links in `<a>` tags.  
- ✅ Use table-based layouts for maximum compatibility.  
- ✅ Inline critical CSS.  
- ✅ Limit main content width to ~600px.  
- ✅ Use clear names for blocks and drop zones.  
- ✅ Modularize templates with macros and partials.  
- ✅ Document all custom fields and functions used.  

---

## 12. Example: Complete Responsive Email Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    img { max-width:100% !important; height:auto !important; }
    @media only screen and (max-width:600px) {
      .two-column .column { display: block !important; width: 100% !important; }
    }
    .product { width: 100%; max-width: 300px; margin: auto; }
    @media (max-width:600px) {
      .product { max-width: 100%; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  $tplBlockArea.begin('{"name":"HeaderBlock","block-area-id":"header1"}')
    <%InsertCSE id="12345"%>
    <h1>Welcome, <%${user.firstName}%>!</h1>
  $tplBlockArea.end()

  <!-- Two Columns -->
  <table class="two-column">
    <tr>
      <td class="column">
        $tplBlockArea.begin('{"name":"LeftContent","block-area-id":"left1"}')
        <h2>Recommended for You</h2>
        <%ForEach var="product" items="${ecx:recommendedProducts('PRECALC', user.pk, '3', 500)}"%>
          <div class="product">
            <img src="<%${product.productImageUrl}%>" alt="<%${product.productName}%>"/>
            <h3><%${product.productName}%></h3>
            <p>Price: $<%${product.productPrice}%></p>
            <a href="<%${product.productUrl}%>">View Product</a>
          </div>
        <%/ForEach%>
        $tplBlockArea.end()
      </td>
      <td class="column">
        $tplBlockArea.begin('{"name":"RightContent","block-area-id":"right1"}')
        <h2>Fashion Sale – This Week Only!</h2>
        <p>Enjoy 50% off on select items. <a href="https://www.example.com/sale">Shop Now »</a></p>
        $tplBlockArea.end()
      </td>
    </tr>
  </table>

  <!-- Footer -->
  $tplBlockArea.begin('{"name":"FooterBlock","block-area-id":"footer1"}')
    <p>If you no longer wish to receive these emails, <a href="<%Unsubscribe%>">unsubscribe here</a>.</p>
  $tplBlockArea.end()
</body>
</html>
```

