# N8N Integration Guide for MCP WooCommerce Server

## 🔥 SOLUTION FOR N8N SCHEMA COMPATIBILITY ERRORS

If you're getting **"Received tool input did not match expected schema"** errors in N8N, use these **specialized N8N endpoints** instead of the standard MCP endpoints.

## 🚀 N8N-Specific Endpoints

### **1. Get Available Tools (N8N Compatible)**
```http
GET http://your-server:3001/n8n/tools
```

**Response:**
```json
{
  "success": true,
  "tools": [
    {
      "name": "wc_get_revenue_stats",
      "description": "Get detailed revenue statistics",
      "schema": {
        "type": "object",
        "properties": {
          "period": {
            "type": "string",
            "enum": ["today", "week", "month", "year"],
            "description": "Report period"
          }
        },
        "required": [],
        "additionalProperties": false
      }
    }
  ],
  "count": 44
}
```

### **2. Execute Tools (N8N Compatible)**
```http
POST http://your-server:3001/n8n/execute
Content-Type: application/json

{
  "toolName": "wc_get_coupon_stats",
  "input": {
    "coupon_code": "holasalud"
  }
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\": true, \"data\": {...}}"
    }
  ],
  "isError": false
}
```

## 🛠️ N8N Workflow Configuration

### **Step 1: HTTP Request Node (Get Tools)**
- **Method**: GET
- **URL**: `http://your-server:3001/n8n/tools`
- **Response**: Use `{{ $json.tools }}` to access available tools

### **Step 2: HTTP Request Node (Execute Tool)**
- **Method**: POST
- **URL**: `http://your-server:3001/n8n/execute`
- **Body**:
  ```json
  {
    "toolName": "{{ $node['Get Tools'].json.tools[0].name }}",
    "input": {
      "period": "month"
    }
  }
  ```

### **Step 3: Parse Response**
- **Expression**: `{{ JSON.parse($json.content[0].text) }}`
- **Access Data**: `{{ $json.data.revenue }}`

## 📋 Available Tools for N8N

### **✅ Analytics Tools (VERIFIED)**
- `wc_get_revenue_stats` - Revenue analytics
- `wc_get_order_stats` - Order statistics  
- `wc_get_customer_analytics` - Customer insights
- `wc_get_coupon_stats` - Coupon performance

### **✅ Customer Tools (VERIFIED)**
- `wc_get_customers` - Customer listing
- `wc_get_top_customers` - Top spending customers
- `wc_get_customer_purchase_history` - Purchase patterns

### **✅ Coupon Tools (VERIFIED)**
- `wc_get_coupons` - Coupon listing
- `wc_get_coupon_usage_stats` - Usage analytics
- `wc_get_coupon_by_code` - Find by code

### **Product & Order Tools**
- `wc_get_products` - Product catalog
- `wc_get_orders` - Order management
- And 30+ more tools...

## 🔧 Schema Compatibility Features

### **Input Sanitization**
- Removes undefined values
- Handles null characters
- Validates data types
- Ensures proper JSON structure

### **Response Formatting**
- Consistent MCP format
- Proper error handling
- JSON string responses
- N8N-compatible structure

### **Error Handling**
```json
{
  "content": [
    {
      "type": "text", 
      "text": "{\"success\": false, \"error\": \"Tool not found\"}"
    }
  ],
  "isError": true
}
```

## 📊 Example Workflows

### **Revenue Dashboard Workflow**
1. **Get Revenue Stats**: `wc_get_revenue_stats` with period "month"
2. **Parse Revenue**: Extract gross_revenue, net_revenue
3. **Get Top Customers**: `wc_get_top_customers` with metric "total_spent"
4. **Create Dashboard**: Combine data for visualization

### **Coupon Performance Workflow**
1. **Get Coupon Stats**: `wc_get_coupon_stats` with specific coupon_code
2. **Get Usage Stats**: `wc_get_coupon_usage_stats` for period analysis
3. **Calculate ROI**: Compare discount vs revenue generated
4. **Alert System**: Trigger if performance drops

## 🚨 Troubleshooting

### **Common Errors & Solutions**

**Error: "Tool input did not match expected schema"**
- ✅ Use `/n8n/execute` endpoint instead of `/mcp`
- ✅ Ensure input is proper JSON object
- ✅ Check tool name spelling

**Error: "Tool not found"**
- ✅ Use `/n8n/tools` to get available tools list
- ✅ Use exact tool name from the list
- ✅ Check server is running with latest version

**Error: "Invalid JSON response"**
- ✅ Parse response with `JSON.parse($json.content[0].text)`
- ✅ Check for isError: true in response
- ✅ Handle error cases in N8N workflow

## 🎯 Production Tips

### **Performance Optimization**
- Use specific date ranges instead of "all_time"
- Limit results with `limit` parameter
- Cache frequently used data in N8N

### **Error Recovery**
- Always check `isError` field
- Implement retry logic for API failures
- Log errors for debugging

### **Security**
- Use environment variables for server URL
- Validate input data before sending
- Monitor API usage and rate limits

## 📞 Support

- **Endpoints**: `/n8n/tools` and `/n8n/execute`
- **Compatibility**: JSON Schema validated
- **Real Data**: 100% WooCommerce integration
- **Status**: Production ready ✅

---

**Ready for N8N automation with full WooCommerce e-commerce capabilities!**