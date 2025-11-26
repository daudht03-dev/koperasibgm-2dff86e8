export interface TemplateElement {
  id: string;
  type: 'company_logo' | 'company_name' | 'farmer_name' | 'farmer_logo' | 'certifications' | 'qr_code' | 'organic_badge' | 'custom_field';
  label: string;
  enabled: boolean;
  styles?: {
    marginTop?: number;
    marginBottom?: number;
    paddingX?: number;
    paddingY?: number;
    fontSize?: number;
  };
  customFieldId?: string;
}
