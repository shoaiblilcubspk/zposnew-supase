import { useRef } from 'react';
import { sonner } from '../../../lib/sonner';
import { useProductsStore } from '../../../stores';
import { newOperationId } from '../../../data';
import { Product } from '../../../types';
import type { ProductFormData } from './useProductForm';


interface UseProductSubmitArgs {
  product: Product | null;
  formData: ProductFormData;
  variants: any[];
  variantData: any[];
  modifiers: any[];
  productAddons: any[];
  appCurrentUser: any;
  appSuppliers: any[];
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  setVariants: React.Dispatch<React.SetStateAction<any[]>>;
  setVariantData: React.Dispatch<React.SetStateAction<any[]>>;
  setModifiers: React.Dispatch<React.SetStateAction<any[]>>;
  setProductAddons: React.Dispatch<React.SetStateAction<any[]>>;
  onClose: () => void;
}

export function useProductSubmit({
  product,
  formData,
  variants,
  variantData,
  modifiers,
  productAddons,
  appCurrentUser,
  appSuppliers,
  setFormData,
  setVariants,
  setVariantData,
  setModifiers,
  setProductAddons,
  onClose,
}: UseProductSubmitArgs) {
  // One operation_id per user action (§1.5.2): generated once at submit start, REUSED on every
  // retry, and only reset after a successful save or discard. Guarantees an idempotent replay.
  const operationIdRef = useRef<string | null>(null);

  const handleSubmit = async () => {
    const role = appCurrentUser?.role;
    if (role === 'cashier') {
      await sonner.alert('Permission Denied', 'Cashiers are not allowed to add or modify products.');
      return;
    }

    if (!formData.name.trim()) {
      await sonner.alert('Error!', 'Please enter a product name');
      return;
    }

    if (!(formData.category || '').trim()) {
      await sonner.alert('Error!', 'Please enter a category');
      return;
    }

    if (!(formData.sku || '').trim()) {
      formData.sku = `SKU-${Date.now().toString().slice(-6)}`;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      await sonner.alert('Error!', 'Please enter a valid price');
      return;
    }

    if (!formData.cost || parseFloat(formData.cost) < 0) {
      await sonner.alert('Error!', 'Please enter a valid cost price (or 0 if no cost)');
      return;
    }

    if (formData.trackInventory) {
      if (formData.minStock && parseInt(formData.minStock) < 0) {
        await sonner.alert('Error!', 'Min stock cannot be negative');
        return;
      }
    }

    const productData: Product = {
      id: product?.id || Date.now().toString(),
      name: formData.name,
      sku: formData.sku,
      barcode: formData.barcode || undefined,
      price: parseFloat(formData.price) || 0,
      cost: parseFloat(formData.cost) || 0,
      stock: formData.trackInventory ? (parseFloat(formData.stock) || 0) : 999999,
      minStock: formData.trackInventory ? (parseFloat(formData.minStock) || 0) : 0,
      targetStock: formData.trackInventory && formData.targetStock ? (parseFloat(formData.targetStock) || undefined) : undefined,
      category: formData.category,
      supplier: formData.supplier || undefined,
      description: formData.description,
      taxable: formData.taxable,
      active: formData.active,
      isWeightBased: false,
      pricePerUnit: undefined,
      unit: undefined,
      image: formData.image || undefined,
      productType: formData.productType || 'simple',
      trackInventory: formData.trackInventory,
      isService: formData.isService,
      requireSerial: formData.requireSerial,
      variants: variants.map(({ name, options }) => ({ name, options })),
      variantData,
      modifiers,
      productAddons,
      expiryDate: formData.expiryDate ? formData.expiryDate : undefined,
      expiryAlertDays: formData.expiryAlertDays ? parseInt(formData.expiryAlertDays) || 90 : 90,
      createdAt: product?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    try {
      const { productsService } = await import('../../../lib/services');

      // Stable operation_id for this submit; kept across retries until success/discard.
      if (!operationIdRef.current) operationIdRef.current = newOperationId();
      const operation_id = operationIdRef.current;

      if (product) {
        const updated = await productsService.update(productData.id, productData, appCurrentUser?.name, operation_id);
        useProductsStore.getState().updateProduct({ ...productData, ...updated });
      } else {
        // Supplier is resolved-or-created INSIDE the create_product bundle (no separate write).
        const newProduct = await productsService.create(productData, appCurrentUser?.name, operation_id);
        useProductsStore.getState().addProduct({ ...newProduct, variantData: productData.variantData });
      }

      // Success -> release the operation_id so the next action gets a fresh one.
      operationIdRef.current = null;

      sonner.success(product ? 'Product updated successfully' : 'Product added successfully');

      if (!product) {
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

      onClose();
    } catch (error: any) {
      console.error('Error saving product:', error);
      sonner.close();

      const errorMsg = error.message || '';

      if (errorMsg.toLowerCase().includes('already exists')) {
        sonner.error(errorMsg);
        return;
      }

      if (error.code === '23505' || error.status === 409) {
        const details = error.details?.toLowerCase() || '';
        let errorMessage = 'A product with this SKU or Barcode already exists.';

        if (details.includes('sku')) {
          errorMessage = 'The SKU you entered already exists. Please use a unique SKU.';
        } else if (details.includes('barcode')) {
          errorMessage = 'The Barcode you entered already exists. Please use a unique barcode.';
        }

        sonner.error(errorMessage);
        return;
      }

      const fallbackMessage = 'Failed to save product. Please try again.';
      await sonner.alert('Error!', fallbackMessage);
    }
  };

  return handleSubmit;
}
