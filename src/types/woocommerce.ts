export interface WooCommerceConfig {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
  version?: string;
  timeout?: number;
}

export interface WooCommerceProduct {
  id?: number;
  name: string;
  type?: 'simple' | 'grouped' | 'external' | 'variable';
  status?: 'draft' | 'pending' | 'private' | 'publish';
  featured?: boolean;
  catalog_visibility?: 'visible' | 'catalog' | 'search' | 'hidden';
  description?: string;
  short_description?: string;
  sku?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  date_on_sale_from?: string;
  date_on_sale_to?: string;
  price_html?: string;
  on_sale?: boolean;
  purchasable?: boolean;
  total_sales?: number;
  virtual?: boolean;
  downloadable?: boolean;
  downloads?: WooCommerceDownload[];
  download_limit?: number;
  download_expiry?: number;
  external_url?: string;
  button_text?: string;
  tax_status?: 'taxable' | 'shipping' | 'none';
  tax_class?: string;
  manage_stock?: boolean;
  stock_quantity?: number;
  backorders?: 'no' | 'notify' | 'yes';
  backorders_allowed?: boolean;
  backordered?: boolean;
  low_stock_amount?: number;
  sold_individually?: boolean;
  weight?: string;
  dimensions?: WooCommerceDimensions;
  shipping_required?: boolean;
  shipping_taxable?: boolean;
  shipping_class?: string;
  shipping_class_id?: number;
  reviews_allowed?: boolean;
  average_rating?: string;
  rating_count?: number;
  upsell_ids?: number[];
  cross_sell_ids?: number[];
  parent_id?: number;
  purchase_note?: string;
  categories?: WooCommerceCategory[];
  tags?: WooCommerceTag[];
  images?: WooCommerceImage[];
  attributes?: WooCommerceAttribute[];
  default_attributes?: WooCommerceDefaultAttribute[];
  variations?: number[];
  grouped_products?: number[];
  menu_order?: number;
  price_html_formatted?: string;
  related_ids?: number[];
  stock_status?: 'instock' | 'outofstock' | 'onbackorder';
  has_options?: boolean;
  post_password?: string;
  global_unique_id?: string;
  meta_data?: WooCommerceMetaData[];
}

export interface WooCommerceOrder {
  id?: number;
  parent_id?: number;
  status?: 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed' | 'trash';
  currency?: string;
  version?: string;
  prices_include_tax?: boolean;
  date_created?: string;
  date_modified?: string;
  discount_total?: string;
  discount_tax?: string;
  shipping_total?: string;
  shipping_tax?: string;
  cart_tax?: string;
  total?: string;
  total_tax?: string;
  customer_id?: number;
  order_key?: string;
  billing?: WooCommerceBilling;
  shipping?: WooCommerceShipping;
  payment_method?: string;
  payment_method_title?: string;
  transaction_id?: string;
  customer_ip_address?: string;
  customer_user_agent?: string;
  created_via?: string;
  customer_note?: string;
  date_completed?: string;
  date_paid?: string;
  cart_hash?: string;
  number?: string;
  meta_data?: WooCommerceMetaData[];
  line_items?: WooCommerceLineItem[];
  tax_lines?: WooCommerceTaxLine[];
  shipping_lines?: WooCommerceShippingLine[];
  fee_lines?: WooCommerceFeeLine[];
  coupon_lines?: WooCommerceCouponLine[];
  refunds?: WooCommerceRefund[];
  payment_url?: string;
  is_editable?: boolean;
  needs_payment?: boolean;
  needs_processing?: boolean;
  date_created_gmt?: string;
  date_modified_gmt?: string;
  date_completed_gmt?: string;
  date_paid_gmt?: string;
  currency_symbol?: string;
}

export interface WooCommerceCustomer {
  id?: number;
  date_created?: string;
  date_modified?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  username?: string;
  password?: string;
  billing?: WooCommerceBilling;
  shipping?: WooCommerceShipping;
  is_paying_customer?: boolean;
  avatar_url?: string;
  meta_data?: WooCommerceMetaData[];
}

export interface WooCommerceCategory {
  id?: number;
  name: string;
  slug?: string;
  parent?: number;
  description?: string;
  display?: 'default' | 'products' | 'subcategories' | 'both';
  image?: WooCommerceImage;
  menu_order?: number;
  count?: number;
}

export interface WooCommerceTag {
  id?: number;
  name: string;
  slug?: string;
  description?: string;
  count?: number;
}

export interface WooCommerceImage {
  id?: number;
  date_created?: string;
  date_modified?: string;
  src: string;
  name?: string;
  alt?: string;
  position?: number;
}

export interface WooCommerceAttribute {
  id?: number;
  name: string;
  position?: number;
  visible?: boolean;
  variation?: boolean;
  options?: string[];
}

export interface WooCommerceDefaultAttribute {
  id?: number;
  name?: string;
  option?: string;
}

export interface WooCommerceDimensions {
  length?: string;
  width?: string;
  height?: string;
}

export interface WooCommerceDownload {
  id?: string;
  name?: string;
  file?: string;
}

export interface WooCommerceMetaData {
  id?: number;
  key: string;
  value: any;
}

export interface WooCommerceBilling {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface WooCommerceShipping {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface WooCommerceLineItem {
  id?: number;
  name?: string;
  product_id?: number;
  variation_id?: number;
  quantity: number;
  tax_class?: string;
  subtotal?: string;
  subtotal_tax?: string;
  total?: string;
  total_tax?: string;
  taxes?: WooCommerceTax[];
  meta_data?: WooCommerceMetaData[];
  sku?: string;
  price?: string;
  image?: WooCommerceImage;
  parent_name?: string;
}

export interface WooCommerceTaxLine {
  id?: number;
  rate_code?: string;
  rate_id?: number;
  label?: string;
  compound?: boolean;
  tax_total?: string;
  shipping_tax_total?: string;
  rate_percent?: number;
  meta_data?: WooCommerceMetaData[];
}

export interface WooCommerceShippingLine {
  id?: number;
  method_title?: string;
  method_id?: string;
  instance_id?: string;
  total?: string;
  total_tax?: string;
  taxes?: WooCommerceTax[];
  meta_data?: WooCommerceMetaData[];
}

export interface WooCommerceFeeLine {
  id?: number;
  name?: string;
  tax_class?: string;
  tax_status?: 'taxable' | 'none';
  total?: string;
  total_tax?: string;
  taxes?: WooCommerceTax[];
  meta_data?: WooCommerceMetaData[];
}

export interface WooCommerceCouponLine {
  id?: number;
  code?: string;
  discount?: string;
  discount_tax?: string;
  meta_data?: WooCommerceMetaData[];
}

export interface WooCommerceRefund {
  id?: number;
  date_created?: string;
  date_created_gmt?: string;
  amount?: string;
  reason?: string;
  refunded_by?: number;
  refunded_payment?: boolean;
  meta_data?: WooCommerceMetaData[];
  line_items?: WooCommerceLineItem[];
}

export interface WooCommerceTax {
  id?: number;
  total?: string;
  subtotal?: string;
}

export interface WooCommerceCoupon {
  id?: number;
  code: string;
  amount?: string;
  date_created?: string;
  date_modified?: string;
  discount_type?: 'percent' | 'fixed_cart' | 'fixed_product';
  description?: string;
  date_expires?: string;
  usage_count?: number;
  individual_use?: boolean;
  product_ids?: number[];
  excluded_product_ids?: number[];
  usage_limit?: number;
  usage_limit_per_user?: number;
  limit_usage_to_x_items?: number;
  free_shipping?: boolean;
  product_categories?: number[];
  excluded_product_categories?: number[];
  exclude_sale_items?: boolean;
  minimum_amount?: string;
  maximum_amount?: string;
  email_restrictions?: string[];
  used_by?: string[];
  meta_data?: WooCommerceMetaData[];
}

export interface WooCommerceApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    data?: any;
  };
}

export interface WooCommerceListParams {
  context?: 'view' | 'edit';
  page?: number;
  per_page?: number;
  search?: string;
  after?: string;
  before?: string;
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: 'asc' | 'desc';
  orderby?: string;
  parent?: number[];
  parent_exclude?: number[];
  status?: string;
  type?: string;
  sku?: string;
  featured?: boolean;
  category?: string;
  tag?: string;
  shipping_class?: string;
  attribute?: string;
  attribute_term?: string;
  tax_class?: string;
  min_price?: string;
  max_price?: string;
  stock_status?: 'instock' | 'outofstock' | 'onbackorder';
  on_sale?: boolean;
  customer?: number;
}