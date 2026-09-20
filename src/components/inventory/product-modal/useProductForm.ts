import { useState, useEffect, useMemo } from 'react';
import { useInventoryStore, useProductsStore, useUsersStore } from '../../../stores';
import { sonner } from '../../../lib/sonner';
import { generateBarcodeValue } from '../../../utils/barcode';
import { Product, ProductVariant, ProductModifier, VariantData, ProductAddon } from '../../../types';

export type ProductFormData = {
  name: string;
  sku: string;
  barcode: string;
  price: string;
  cost: string;
  stock: string;
  minStock: string;
  targetStock: string;
  category: string;
  supplier: string;
  description: string;
  taxable: boolean;
  active: boolean;
  trackInventory: boolean;
  image: string;
  isService: boolean;
  requireSerial: boolean;
  productType: 'simple' | 'variable';
  expiryDate: string;
  expiryAlertDays: string;
};

export function useProductForm(product: Product | null) {
  const appCategories = useInventoryStore(s => s.categories);
  const appProducts = useProductsStore(s => s.products);
  const appSuppliers = useInventoryStore(s => s.suppliers);
  const appCurrentUser = useUsersStore(s => s.currentUser);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    barcode: '',
    price: '',
    cost: '',
    stock: '',
    minStock: '',
    targetStock: '',
    category: '',
    supplier: '',
    description: '',
    taxable: true,
    active: true,
    trackInventory: true,
    image: '',
    isService: false,
    requireSerial: false,
    productType: 'simple',
    expiryDate: '',
    expiryAlertDays: '90',
  });

  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantData, setVariantData] = useState<VariantData[]>([]);
  const [modifiers, setModifiers] = useState<ProductModifier[]>([]);
  const [productAddons, setProductAddons] = useState<ProductAddon[]>([]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        price: product.price?.toString() || '0',
        cost: product.cost?.toString() || '0',
        stock: product.stock?.toString() || '0',
        minStock: product.minStock?.toString() || '0',
        targetStock: product.targetStock?.toString() || '',
        category: product.category || '',
        supplier: product.supplier || '',
        description: product.description || '',
        taxable: product.taxable ?? true,
        active: product.active ?? true,
        trackInventory: product.trackInventory ?? true,
        image: product.image || '',
        isService: product.isService ?? false,
        requireSerial: product.requireSerial ?? false,
        productType: (product.productType === 'variable') ? 'variable' : 'simple',
        expiryDate: product.expiryDate || '',
        expiryAlertDays: (product.expiryAlertDays !== undefined ? product.expiryAlertDays : 90).toString(),
      });
      setVariants((product.variants || []).map(v => ({ ...v, optionsRaw: '' })));
      setVariantData(product.variantData || []);
      setModifiers(product.modifiers || []);
      setProductAddons(product.productAddons || []);
    } else {
      setFormData({
        name: '',
        sku: '',
        barcode: '',
        price: '',
        cost: '',
        stock: '',
        minStock: '',
        targetStock: '',
        category: '',
        supplier: '',
        description: '',
        taxable: true,
        active: true,
        trackInventory: true,
        image: '',
        isService: false,
        requireSerial: false,
        productType: 'simple',
        expiryDate: '',
        expiryAlertDays: '90',
      });
      setVariants([]);
      setVariantData([]);
      setModifiers([]);
      setProductAddons([]);
    }
  }, [product]);

  const categories = useMemo(() => {
    const fromCatTable = (appCategories || []).map(c => {
      if (typeof c === 'object' && c !== null) {
        if (typeof c.name === 'string' && c.name.trim().startsWith('{')) {
          try {
            return JSON.parse(c.name).name || c.name;
          } catch (_) { }
        }
        return c.name;
      }
      if (typeof c === 'string') {
        if (c.trim().startsWith('{')) {
          try {
            return JSON.parse(c).name || c;
          } catch (_) { }
        }
        return c;
      }
      return '';
    }).filter(Boolean);

    const fromProducts = appProducts.map(p => {
      const cat = p.category;
      if (typeof cat === 'string' && cat.trim().startsWith('{')) {
        try {
          return JSON.parse(cat).name || cat;
        } catch (_) { }
      }
      return cat;
    }).filter(Boolean);

    const list = new Set([...fromCatTable, ...fromProducts]);
    if (formData.category) {
      let cat = formData.category;
      if (typeof cat === 'string' && cat.trim().startsWith('{')) {
        try {
          cat = JSON.parse(cat).name || cat;
        } catch (_) { }
      }
      list.add(cat);
    }
    return Array.from(list).sort();
  }, [appCategories, appProducts, formData.category]);

  const suppliers = useMemo(() => {
    const list = new Set(appSuppliers.map(s => s.name).filter(Boolean));
    if (formData.supplier) list.add(formData.supplier);
    return Array.from(list).sort();
  }, [appSuppliers, formData.supplier]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    let finalValue = value;
    if (name === 'sku' || name === 'barcode') {
      finalValue = value.toUpperCase();
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : finalValue
    }));
  };

  const generateBarcode = () => {
    if (!formData.name.trim()) {
      sonner.alert('Info', 'Please enter a product name first to generate a barcode');
      return;
    }
    const barcode = generateBarcodeValue(formData.name);
    setFormData(prev => ({ ...prev, barcode }));
  };

  const generateSku = () => {
    if (!formData.name.trim()) {
      sonner.alert('Info', 'Please enter a product name first to generate a smart SKU');
      return;
    }

    const words = formData.name.trim().split(/\s+/);
    let prefix = '';

    if (words.length >= 2) {
      prefix = (words[0].substring(0, 2) + words[1].substring(0, 2)).toUpperCase();
    } else if (words[0].length >= 3) {
      prefix = words[0].substring(0, 3).toUpperCase();
    } else {
      prefix = words[0].toUpperCase() + 'X';
    }

    const randomDigits = Math.floor(100 + Math.random() * 900).toString();
    const sku = prefix + '-' + randomDigits;

    setFormData(prev => ({ ...prev, sku }));
  };

  const handleAddCategory = async () => {
    const result = await sonner.input('New Category', 'Enter category name:');
    if (result.isConfirmed && result.value) {
      const catName = result.value.trim().toUpperCase();
      try {
        const { categoriesService } = await import('../../../lib/services');
        const created = await categoriesService.create(catName);
        useInventoryStore.getState().addCategory(created);
        setFormData(prev => ({ ...prev, category: catName }));
        sonner.success(`Category "${catName}" saved.`);
      } catch (err: any) {
        setFormData(prev => ({ ...prev, category: catName }));
        sonner.error(err?.message || 'Failed to save category');
      }
    }
  };

  const handleAddSupplier = async () => {
    const result = await sonner.input('New Supplier', 'Enter supplier name:');
    if (result.isConfirmed && result.value) {
      const supName = result.value.trim().toUpperCase();
      try {
        const { suppliersService } = await import('../../../lib/services');
        const created = await suppliersService.create({
          name: supName,
          email: '', phone: '', address: '', businessType: 'General',
          paymentTerms: '', openingBalance: 0, rating: 0
        });
        useInventoryStore.getState().addSupplier(created);
        setFormData(prev => ({ ...prev, supplier: supName }));
        sonner.success(`Supplier "${supName}" saved.`);
      } catch (err: any) {
        setFormData(prev => ({ ...prev, supplier: supName }));
        sonner.error(err?.message || 'Failed to save supplier');
      }
    }
  };

  return {
    appCategories,
    appProducts,
    appSuppliers,
    appCurrentUser,
    formData,
    setFormData,
    variants,
    setVariants,
    variantData,
    setVariantData,
    modifiers,
    setModifiers,
    productAddons,
    setProductAddons,
    categories,
    suppliers,
    handleChange,
    generateBarcode,
    generateSku,
    handleAddCategory,
    handleAddSupplier,
  };
}
