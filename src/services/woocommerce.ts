import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { WooCommerceConfig, WooCommerceProduct, WooCommerceOrder, WooCommerceCustomer, WooCommerceCategory, WooCommerceTag, WooCommerceCoupon, WooCommerceListParams } from '../types/woocommerce.js';
import { Logger } from '../utils/logger.js';

export class WooCommerceService {
  private client: AxiosInstance;
  private logger: Logger;

  constructor(config: WooCommerceConfig) {
    this.logger = Logger.getInstance();
    
    // Validate configuration
    if (!config.siteUrl || !config.consumerKey || !config.consumerSecret) {
      throw new Error('WooCommerce configuration incomplete: siteUrl, consumerKey, and consumerSecret are required');
    }

    // Clean and validate site URL
    const baseURL = config.siteUrl.replace(/\/$/, '') + `/wp-json/wc/v${config.version || '3'}/`;

    this.client = axios.create({
      baseURL,
      timeout: config.timeout || 30000,
      auth: {
        username: config.consumerKey,
        password: config.consumerSecret
      },
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MCP-WooCommerce-Server/1.0.0'
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use((config) => {
      this.logger.debug(`WooCommerce API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data
      });
      return config;
    });

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(`WooCommerce API Response: ${response.status}`, {
          data: response.data
        });
        return response;
      },
      (error) => {
        this.logger.error('WooCommerce API Error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        
        // Transform WooCommerce API errors to standardized format
        const errorMessage = error.response?.data?.message || error.message || 'Unknown API error';
        const errorCode = error.response?.data?.code || error.response?.status || 'UNKNOWN_ERROR';
        
        throw new Error(`WooCommerce API Error (${errorCode}): ${errorMessage}`);
      }
    );
  }

  // Generic API methods
  private async get<T = any>(endpoint: string, params?: any): Promise<T> {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  private async post<T = any>(endpoint: string, data?: any): Promise<T> {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  private async put<T = any>(endpoint: string, data?: any): Promise<T> {
    const response = await this.client.put(endpoint, data);
    return response.data;
  }

  private async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    const response = await this.client.patch(endpoint, data);
    return response.data;
  }

  private async delete<T = any>(endpoint: string, params?: any): Promise<T> {
    const response = await this.client.delete(endpoint, { params });
    return response.data;
  }

  // PRODUCTS
  async getProducts(params?: WooCommerceListParams): Promise<WooCommerceProduct[]> {
    return await this.get<WooCommerceProduct[]>('products', params);
  }

  async getProduct(id: number): Promise<WooCommerceProduct> {
    return await this.get<WooCommerceProduct>(`products/${id}`);
  }

  async createProduct(product: Partial<WooCommerceProduct>): Promise<WooCommerceProduct> {
    return await this.post<WooCommerceProduct>('products', product);
  }

  async updateProduct(id: number, product: Partial<WooCommerceProduct>): Promise<WooCommerceProduct> {
    return await this.put<WooCommerceProduct>(`products/${id}`, product);
  }

  async deleteProduct(id: number, force = false): Promise<WooCommerceProduct> {
    return await this.delete<WooCommerceProduct>(`products/${id}`, { force });
  }

  async batchProducts(data: { create?: Partial<WooCommerceProduct>[], update?: Partial<WooCommerceProduct>[], delete?: number[] }): Promise<any> {
    return await this.post('products/batch', data);
  }

  // PRODUCT CATEGORIES
  async getCategories(params?: WooCommerceListParams): Promise<WooCommerceCategory[]> {
    return await this.get<WooCommerceCategory[]>('products/categories', params);
  }

  async getCategory(id: number): Promise<WooCommerceCategory> {
    return await this.get<WooCommerceCategory>(`products/categories/${id}`);
  }

  async createCategory(category: Partial<WooCommerceCategory>): Promise<WooCommerceCategory> {
    return await this.post<WooCommerceCategory>('products/categories', category);
  }

  async updateCategory(id: number, category: Partial<WooCommerceCategory>): Promise<WooCommerceCategory> {
    return await this.put<WooCommerceCategory>(`products/categories/${id}`, category);
  }

  async deleteCategory(id: number, force = false): Promise<WooCommerceCategory> {
    return await this.delete<WooCommerceCategory>(`products/categories/${id}`, { force });
  }

  // PRODUCT TAGS
  async getTags(params?: WooCommerceListParams): Promise<WooCommerceTag[]> {
    return await this.get<WooCommerceTag[]>('products/tags', params);
  }

  async getTag(id: number): Promise<WooCommerceTag> {
    return await this.get<WooCommerceTag>(`products/tags/${id}`);
  }

  async createTag(tag: Partial<WooCommerceTag>): Promise<WooCommerceTag> {
    return await this.post<WooCommerceTag>('products/tags', tag);
  }

  async updateTag(id: number, tag: Partial<WooCommerceTag>): Promise<WooCommerceTag> {
    return await this.put<WooCommerceTag>(`products/tags/${id}`, tag);
  }

  async deleteTag(id: number, force = false): Promise<WooCommerceTag> {
    return await this.delete<WooCommerceTag>(`products/tags/${id}`, { force });
  }

  // ORDERS
  async getOrders(params?: WooCommerceListParams): Promise<WooCommerceOrder[]> {
    return await this.get<WooCommerceOrder[]>('orders', params);
  }

  async getOrder(id: number): Promise<WooCommerceOrder> {
    return await this.get<WooCommerceOrder>(`orders/${id}`);
  }

  async createOrder(order: Partial<WooCommerceOrder>): Promise<WooCommerceOrder> {
    return await this.post<WooCommerceOrder>('orders', order);
  }

  async updateOrder(id: number, order: Partial<WooCommerceOrder>): Promise<WooCommerceOrder> {
    return await this.put<WooCommerceOrder>(`orders/${id}`, order);
  }

  async deleteOrder(id: number, force = false): Promise<WooCommerceOrder> {
    return await this.delete<WooCommerceOrder>(`orders/${id}`, { force });
  }

  async batchOrders(data: { create?: Partial<WooCommerceOrder>[], update?: Partial<WooCommerceOrder>[], delete?: number[] }): Promise<any> {
    return await this.post('orders/batch', data);
  }

  // ORDER NOTES
  async getOrderNotes(orderId: number): Promise<any[]> {
    return await this.get(`orders/${orderId}/notes`);
  }

  async getOrderNote(orderId: number, noteId: number): Promise<any> {
    return await this.get(`orders/${orderId}/notes/${noteId}`);
  }

  async createOrderNote(orderId: number, note: { note: string, customer_note?: boolean }): Promise<any> {
    return await this.post(`orders/${orderId}/notes`, note);
  }

  async deleteOrderNote(orderId: number, noteId: number, force = false): Promise<any> {
    return await this.delete(`orders/${orderId}/notes/${noteId}`, { force });
  }

  // CUSTOMERS
  async getCustomers(params?: WooCommerceListParams): Promise<WooCommerceCustomer[]> {
    return await this.get<WooCommerceCustomer[]>('customers', params);
  }

  async getCustomer(id: number): Promise<WooCommerceCustomer> {
    return await this.get<WooCommerceCustomer>(`customers/${id}`);
  }

  async createCustomer(customer: Partial<WooCommerceCustomer>): Promise<WooCommerceCustomer> {
    return await this.post<WooCommerceCustomer>('customers', customer);
  }

  async updateCustomer(id: number, customer: Partial<WooCommerceCustomer>): Promise<WooCommerceCustomer> {
    return await this.put<WooCommerceCustomer>(`customers/${id}`, customer);
  }

  async deleteCustomer(id: number, force = false, reassign?: number): Promise<WooCommerceCustomer> {
    const params: any = { force };
    if (reassign) params.reassign = reassign;
    return await this.delete<WooCommerceCustomer>(`customers/${id}`, params);
  }

  async batchCustomers(data: { create?: Partial<WooCommerceCustomer>[], update?: Partial<WooCommerceCustomer>[], delete?: number[] }): Promise<any> {
    return await this.post('customers/batch', data);
  }

  // COUPONS
  async getCoupons(params?: WooCommerceListParams): Promise<WooCommerceCoupon[]> {
    return await this.get<WooCommerceCoupon[]>('coupons', params);
  }

  async getCoupon(id: number): Promise<WooCommerceCoupon> {
    return await this.get<WooCommerceCoupon>(`coupons/${id}`);
  }

  async createCoupon(coupon: Partial<WooCommerceCoupon>): Promise<WooCommerceCoupon> {
    return await this.post<WooCommerceCoupon>('coupons', coupon);
  }

  async updateCoupon(id: number, coupon: Partial<WooCommerceCoupon>): Promise<WooCommerceCoupon> {
    return await this.put<WooCommerceCoupon>(`coupons/${id}`, coupon);
  }

  async deleteCoupon(id: number, force = false): Promise<WooCommerceCoupon> {
    return await this.delete<WooCommerceCoupon>(`coupons/${id}`, { force });
  }

  // REPORTS
  async getSalesReport(params?: any): Promise<any> {
    return await this.get('reports/sales', params);
  }

  async getTopSellersReport(params?: any): Promise<any> {
    return await this.get('reports/top_sellers', params);
  }

  async getCouponsReport(params?: any): Promise<any> {
    return await this.get('reports/coupons', params);
  }

  async getCustomersReport(params?: any): Promise<any> {
    return await this.get('reports/customers', params);
  }

  // SETTINGS
  async getSettings(): Promise<any> {
    return await this.get('settings');
  }

  async getSettingGroup(groupId: string): Promise<any> {
    return await this.get(`settings/${groupId}`);
  }

  async getSettingOption(groupId: string, optionId: string): Promise<any> {
    return await this.get(`settings/${groupId}/${optionId}`);
  }

  async updateSettingOption(groupId: string, optionId: string, data: any): Promise<any> {
    return await this.put(`settings/${groupId}/${optionId}`, data);
  }

  // SYSTEM STATUS
  async getSystemStatus(): Promise<any> {
    return await this.get('system_status');
  }

  // SHIPPING
  async getShippingZones(): Promise<any[]> {
    return await this.get('shipping/zones');
  }

  async getShippingZone(id: number): Promise<any> {
    return await this.get(`shipping/zones/${id}`);
  }

  async createShippingZone(zone: any): Promise<any> {
    return await this.post('shipping/zones', zone);
  }

  async updateShippingZone(id: number, zone: any): Promise<any> {
    return await this.put(`shipping/zones/${id}`, zone);
  }

  async deleteShippingZone(id: number, force = false): Promise<any> {
    return await this.delete(`shipping/zones/${id}`, { force });
  }

  async getShippingMethods(): Promise<any[]> {
    return await this.get('shipping_methods');
  }

  // TAXES
  async getTaxClasses(): Promise<any[]> {
    return await this.get('taxes/classes');
  }

  async getTaxRates(params?: any): Promise<any[]> {
    return await this.get('taxes', params);
  }

  async getTaxRate(id: number): Promise<any> {
    return await this.get(`taxes/${id}`);
  }

  async createTaxRate(taxRate: any): Promise<any> {
    return await this.post('taxes', taxRate);
  }

  async updateTaxRate(id: number, taxRate: any): Promise<any> {
    return await this.put(`taxes/${id}`, taxRate);
  }

  async deleteTaxRate(id: number, force = false): Promise<any> {
    return await this.delete(`taxes/${id}`, { force });
  }

  // WEBHOOKS
  async getWebhooks(params?: any): Promise<any[]> {
    return await this.get('webhooks', params);
  }

  async getWebhook(id: number): Promise<any> {
    return await this.get(`webhooks/${id}`);
  }

  async createWebhook(webhook: any): Promise<any> {
    return await this.post('webhooks', webhook);
  }

  async updateWebhook(id: number, webhook: any): Promise<any> {
    return await this.put(`webhooks/${id}`, webhook);
  }

  async deleteWebhook(id: number, force = false): Promise<any> {
    return await this.delete(`webhooks/${id}`, { force });
  }

  // PAYMENT GATEWAYS
  async getPaymentGateways(): Promise<any[]> {
    return await this.get('payment_gateways');
  }

  async getPaymentGateway(id: string): Promise<any> {
    return await this.get(`payment_gateways/${id}`);
  }

  async updatePaymentGateway(id: string, gateway: any): Promise<any> {
    return await this.put(`payment_gateways/${id}`, gateway);
  }

  // HEALTH CHECK
  async healthCheck(): Promise<{ status: string, timestamp: string }> {
    try {
      await this.get('');
      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`WooCommerce API health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}