import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import Sidebar from "../../Components/Sidebar/Sidebar";

const CreatePurchaseOrder = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // State
  const [poFormData, setPoFormData] = useState({
    po_no: "",
    po_date: "",
    po_type: "",
    pay_mode: "",
    discount: "",
    sub_total: "",
    grand_total: "",
    vds_total: "",
    tds_total: "",
    vendor_id: "",
    store_id: "",
    currency: "BDT",
    subject: "",
    remarks: "",
    company_code: "",
    created_by: "",
    modified_by: "",
    po_id: "",
  });
  const [itemsFormData, setItemsFormData] = useState([
    {
      line_no: "1",
      inv_product_id: "",
      quantity: "",
      unit_price: "",
      discount: "",
      discount_pct: "",
      total_price: "",
      vds_pct: "",
      vds: "",
      tds_pct: "",
      tds: "",
      po_id: "",
      manual_total_price: false,
      manual_vds: false,
      manual_tds: false,
    },
  ]);
  const [organizations, setOrganizations] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Decode JWT
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.id);
        setPoFormData((prev) => ({
          ...prev,
          created_by: decoded.id.toString(),
          modified_by: decoded.id.toString(),
        }));
      } catch (err) {
        console.error("Error decoding JWT:", err);
        setError("Invalid authentication token");
      }
    }
  }, []);

  // Fetch organizations, products, and purchase orders
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [orgResponse, productResponse, poResponse] = await Promise.all([
          axios.get("http://localhost:5000/api/organization", {
            headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
          }),
          axios.get("http://localhost:5000/api/invproduct", {
            headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
          }),
          axios.get("http://localhost:5000/api/purchaseorder", {
            headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
          }),
        ]);
        setOrganizations(orgResponse.data || []);
        setProducts(productResponse.data || []);
        setPurchaseOrders(poResponse.data || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to fetch required data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle Purchase Order field changes
  const handlePoChange = useCallback((e) => {
    const { name, value } = e.target;
    setPoFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Handle item field changes
  const handleItemChange = useCallback((index, field, value) => {
    setItemsFormData((prev) => {
      const updatedItems = [...prev];
      updatedItems[index] = { ...updatedItems[index], [field]: value };

      // Mark manual overrides
      if (field === "total_price") updatedItems[index].manual_total_price = true;
      if (field === "vds") updatedItems[index].manual_vds = true;
      if (field === "tds") updatedItems[index].manual_tds = true;

      return updatedItems;
    });
  }, []);

  // Calculate item values
  const calculateItemValues = useCallback(
    (item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unit_price = parseFloat(item.unit_price) || 0;
      const discount = parseFloat(item.discount) || 0;
      const vds_pct = parseFloat(item.vds_pct) || 0;
      const tds_pct = parseFloat(item.tds_pct) || 0;

      const total_price = item.manual_total_price
        ? item.total_price
        : (quantity * unit_price).toFixed(2);
      const discount_pct = quantity * unit_price > 0
        ? Math.min((discount / (quantity * unit_price)) * 100, 100).toFixed(2)
        : item.discount_pct || "0";
      const base_amount = quantity * unit_price - discount;
      const vds = item.manual_vds
        ? item.vds
        : (base_amount * (vds_pct / 100)).toFixed(2);
      const tds = item.manual_tds
        ? item.tds
        : (base_amount * (tds_pct / 100)).toFixed(2);

      return {
        total_price: total_price || "",
        discount_pct: discount_pct || "",
        vds: vds || "",
        tds: tds || "",
      };
    },
    []
  );

  // Update items with calculated values
  const updatedItems = useMemo(() => {
    return itemsFormData.map((item) => ({
      ...item,
      ...calculateItemValues(item),
    }));
  }, [itemsFormData, calculateItemValues]);

  // Add new item
  const addItem = useCallback(() => {
    setItemsFormData((prev) => [
      ...prev,
      {
        line_no: (prev.length + 1).toString(),
        inv_product_id: "",
        quantity: "",
        unit_price: "",
        discount: "",
        discount_pct: "",
        total_price: "",
        vds_pct: "",
        vds: "",
        tds_pct: "",
        tds: "",
        po_id: "",
        manual_total_price: false,
        manual_vds: false,
        manual_tds: false,
      },
    ]);
  }, []);

  // Delete item
  const deleteItem = useCallback((index) => {
    setItemsFormData((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Validate form
  const isFormValid = useCallback(() => {
    const poValid =
      poFormData.po_no &&
      poFormData.po_date &&
      poFormData.vendor_id &&
      poFormData.store_id &&
      poFormData.sub_total &&
      poFormData.grand_total;
    const itemsValid = updatedItems.every(
      (item) =>
        item.inv_product_id &&
        item.quantity &&
        item.unit_price &&
        item.total_price
    );
    return poValid && updatedItems.length > 0 && itemsValid;
  }, [poFormData, updatedItems]);

  // Submit form
  const handleSubmit = useCallback(async () => {
    if (!isFormValid()) {
      setError(
        "Please fill all required fields: PO Number, PO Date, Vendor, Store, Subtotal, Grand Total, and at least one item with Product, Quantity, Unit Price, and Total Price"
      );
      return;
    }

    setLoading(true);
    try {
      // Create Purchase Order
      const poPayload = {
        po_no: poFormData.po_no,
        po_date: poFormData.po_date || null,
        po_type: poFormData.po_type || null,
        pay_mode: poFormData.pay_mode || null,
        discount: parseFloat(poFormData.discount) || null,
        sub_total: parseFloat(poFormData.sub_total) || null,
        grand_total: parseFloat(poFormData.grand_total) || null,
        vds_total: parseFloat(poFormData.vds_total) || null,
        tds_total: parseFloat(poFormData.tds_total) || null,
        vendor_id: parseInt(poFormData.vendor_id) || null,
        store_id: parseInt(poFormData.store_id) || null,
        currency: poFormData.currency || null,
        subject: poFormData.subject || null,
        remarks: poFormData.remarks || null,
        company_code: poFormData.company_code || null,
        created_by: poFormData.created_by || null,
        modified_by: poFormData.modified_by || null,
        po_id: poFormData.po_id ? parseInt(poFormData.po_id) : null,
      };

      const poResponse = await axios.post(
        "http://localhost:5000/api/purchaseorder",
        poPayload,
        { headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` } }
      );

      const po_id = poResponse.data.purchaseOrder.id;

      // Create Purchase Order Details
      const itemPromises = updatedItems.map((item) =>
        axios.post(
          "http://localhost:5000/api/purchaseorderdetail",
          {
            line_no: item.line_no || null,
            inv_product_id: parseInt(item.inv_product_id) || null,
            quantity: parseFloat(item.quantity) || null,
            unit_price: parseFloat(item.unit_price) || null,
            discount: parseFloat(item.discount) || null,
            discount_pct: parseFloat(item.discount_pct) || null,
            total_price: parseFloat(item.total_price) || null,
            vds_pct: parseFloat(item.vds_pct) || null,
            vds: parseFloat(item.vds) || null,
            tds_pct: parseFloat(item.tds_pct) || null,
            tds: parseFloat(item.tds) || null,
            po_id: item.po_id ? parseInt(item.po_id) : po_id,
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` } }
        )
      );

      await Promise.all(itemPromises);

      // Reset forms
      setPoFormData({
        po_no: "",
        po_date: "",
        po_type: "",
        pay_mode: "",
        discount: "",
        sub_total: "",
        grand_total: "",
        vds_total: "",
        tds_total: "",
        vendor_id: "",
        store_id: "",
        currency: "BDT",
        subject: "",
        remarks: "",
        company_code: "",
        created_by: userId ? userId.toString() : "",
        modified_by: userId ? userId.toString() : "",
        po_id: "",
      });
      setItemsFormData([
        {
          line_no: "1",
          inv_product_id: "",
          quantity: "",
          unit_price: "",
          discount: "",
          discount_pct: "",
          total_price: "",
          vds_pct: "",
          vds: "",
          tds_pct: "",
          tds: "",
          po_id: "",
          manual_total_price: false,
          manual_vds: false,
          manual_tds: false,
        },
      ]);
      setError(null);
      alert("Purchase Order and Details saved successfully!");
    } catch (err) {
      console.error("Error saving purchase order:", err);
      setError(`Failed to save purchase order: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  }, [poFormData, updatedItems, userId, isFormValid]);

  // Common input styles
  const inputStyles = {
    "& .MuiInputLabel-root": {
      fontSize: { xs: "0.75rem", sm: "0.875rem" },
      color: "#6b7280",
      "&.Mui-focused": { color: "#6366f1" },
    },
    "& .MuiInputBase-input": {
      fontSize: { xs: "0.75rem", sm: "0.875rem" },
      fontFamily: "Inter, sans-serif",
    },
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e5e7eb" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#6366f1" },
    "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#6366f1",
      borderWidth: "2px",
    },
  };

  // Common select styles
  const selectStyles = {
    fontSize: { xs: "0.75rem", sm: "0.875rem" },
    fontFamily: "Inter, sans-serif",
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e5e7eb" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#6366f1" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#6366f1",
      borderWidth: "2px",
    },
    minWidth: "100%",
    maxWidth: "350px",
  };

  return (
    <Sidebar>
      <Box
        sx={{
          maxWidth: 1600,
          mx: "auto",
          p: { xs: 2, sm: 4 },
          bgcolor: "#f9fafb",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={isMobile ? 24 : 40} />
          </Box>
        ) : (
          <>
            {error && (
              <Typography
                sx={{
                  color: "#ef4444",
                  mb: 3,
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                  fontWeight: 500,
                  bgcolor: "#fef2f2",
                  p: 2,
                  borderRadius: "8px",
                }}
              >
                {error}
              </Typography>
            )}

            {/* Section 1: Purchase Order Information */}
            <Paper
              sx={{
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                p: { xs: 2, sm: 4 },
                mb: 4,
                bgcolor: "white",
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: "1.5rem", sm: "1.75rem" },
                  fontWeight: 700,
                  mb: 3,
                  pb: 1,
                  borderBottom: "2px solid #e5e7eb",
                  color: "#1f2937",
                  textAlign: "left",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Purchase Order Information
              </Typography>
              <TableContainer sx={{ maxWidth: "100%", overflowX: "auto", borderRadius: "8px", mt: 2 }}>
                <Table sx={{ minWidth: 3000 }}>
                  <TableHead>
                    <TableRow>
                      {[
                        "PO Number *",
                        "PO Date *",
                        "PO Type",
                        "Payment Mode",
                        "Vendor *",
                        "Store *",
                        "Currency",
                        "Subject",
                        "Remarks",
                        "Created By",
                        "Modified By",
                        "Discount",
                        "Subtotal *",
                        "Grand Total *",
                        "VDS Total",
                        "TDS Total",
                        "Company Code",
                        "Parent PO",
                      ].map((header, index) => (
                        <TableCell
                          key={header}
                          sx={{
                            bgcolor: "#e5e7eb",
                            fontWeight: 700,
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            p: { xs: 1, sm: 1.5 },
                            borderRight: index < 17 ? "1px solid #d1d5db" : "none",
                            color: "#1f2937",
                            minWidth: [4, 5, 6, 17].includes(index) ? 250 : 120,
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow sx={{ "&:hover": { bgcolor: "#f3f4f6" }, bgcolor: "#fafafa" }}>
                      {/* PO Number */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <TextField
                          label="PO Number *"
                          name="po_no"
                          value={poFormData.po_no}
                          onChange={handlePoChange}
                          fullWidth
                          size="small"
                          variant="outlined"
                          sx={inputStyles}
                        />
                      </TableCell>
                      {/* PO Date */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <TextField
                          label="PO Date *"
                          name="po_date"
                          type="date"
                          value={poFormData.po_date}
                          onChange={handlePoChange}
                          fullWidth
                          size="small"
                          variant="outlined"
                          InputLabelProps={{ shrink: true }}
                          sx={inputStyles}
                        />
                      </TableCell>
                      {/* PO Type */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <TextField
                          label="PO Type"
                          name="po_type"
                          value={poFormData.po_type}
                          onChange={handlePoChange}
                          fullWidth
                          size="small"
                          variant="outlined"
                          sx={inputStyles}
                        />
                      </TableCell>
                      {/* Payment Mode */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <TextField
                          label="Payment Mode"
                          name="pay_mode"
                          value={poFormData.pay_mode}
                          onChange={handlePoChange}
                          fullWidth
                          size="small"
                          variant="outlined"
                          sx={inputStyles}
                        />
                      </TableCell>
                      {/* Vendor */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <FormControl fullWidth size="small">
                          <InputLabel
                            sx={{
                              fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              color: "#6b7280",
                              "&.Mui-focused": { color: "#6366f1" },
                              "&::after": { content: '"*"', ml: 0.25 },
                            }}
                          >
                            Select Vendor
                          </InputLabel>
                          <Select
                            name="vendor_id"
                            value={poFormData.vendor_id}
                            onChange={handlePoChange}
                            sx={selectStyles}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  maxHeight: 300,
                                  "& .MuiMenuItem-root": {
                                    fontSize: "0.875rem",
                                    whiteSpace: "normal",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  },
                                },
                              },
                            }}
                          >
                            <MenuItem value="">Select Vendor</MenuItem>
                            {organizations.map((org) => (
                              <MenuItem key={org.id} value={org.id.toString()}>
                                {org.name} ({org.code})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      {/* Store */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <FormControl fullWidth size="small">
                          <InputLabel
                            sx={{
                              fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              color: "#6b7280",
                              "&.Mui-focused": { color: "#6366f1" },
                              "&::after": { content: '"*"', ml: 0.25 },
                            }}
                          >
                            Select Store
                          </InputLabel>
                          <Select
                            name="store_id"
                            value={poFormData.store_id}
                            onChange={handlePoChange}
                            sx={selectStyles}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  maxHeight: 300,
                                  "& .MuiMenuItem-root": {
                                    fontSize: "0.875rem",
                                    whiteSpace: "normal",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  },
                                },
                              },
                            }}
                          >
                            <MenuItem value="">Select Store</MenuItem>
                            {organizations.map((org) => (
                              <MenuItem key={org.id} value={org.id.toString()}>
                                {org.name} ({org.code})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      {/* Currency */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <FormControl fullWidth size="small">
                          <InputLabel
                            sx={{
                              fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              color: "#6b7280",
                              "&.Mui-focused": { color: "#6366f1" },
                            }}
                          >
                            Select Currency
                          </InputLabel>
                          <Select
                            name="currency"
                            value={poFormData.currency}
                            onChange={handlePoChange}
                            sx={selectStyles}
                          >
                            <MenuItem value="BDT">BDT</MenuItem>
                            <MenuItem value="USD">USD</MenuItem>
                            <MenuItem value="EUR">EUR</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      {/* Subject */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <TextField
                          label="Subject"
                          name="subject"
                          value={poFormData.subject}
                          onChange={handlePoChange}
                          fullWidth
                          size="small"
                          variant="outlined"
                          placeholder="e.g. Office Supplies Order"
                          sx={inputStyles}
                        />
                      </TableCell>
                      {/* Remarks */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <TextField
                          label="Remarks"
                          name="remarks"
                          value={poFormData.remarks}
                          onChange={handlePoChange}
                          fullWidth
                          size="small"
                          variant="outlined"
                          placeholder="e.g. Urgent delivery required"
                          sx={inputStyles}
                        />
                      </TableCell>
                      {/* Created By */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <TextField
                          label="Created By"
                          name="created_by"
                          value={poFormData.created_by}
                          disabled
                          fullWidth
                          size="small"
                          variant="outlined"
                          sx={inputStyles}
                        />
                      </TableCell>
                      {/* Modified By */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <TextField
                          label="Modified By"
                          name="modified_by"
                          value={poFormData.modified_by}
                          disabled
                          fullWidth
                          size="small"
                          variant="outlined"
                          sx={inputStyles}
                        />
                      </TableCell>
                      {/* Discount */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <TextField
                          label="Discount"
                          name="discount"
                          type="number"
                          value={poFormData.discount}
                          onChange={handlePoChange}
                          fullWidth
                          size="small"
                          variant="outlined"
                          inputProps={{ min: 0 }}
                          sx={inputStyles}
                        />
                      </TableCell>
                      {/* Subtotal */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <TextField
                          label="Subtotal"
                          name="sub_total"
                          type="number"
                          value={poFormData.sub_total}
                          onChange={handlePoChange}
                          fullWidth
                          size="small"
                          variant="outlined"
                          required
                          inputProps={{ min: 0 }}
                          sx={inputStyles}
                        />
                      </TableCell>
                      {/* Grand Total */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <TextField
                          label="Grand Total"
                          name="grand_total"
                          type="number"
                          value={poFormData.grand_total}
                          onChange={handlePoChange}
                          fullWidth
                          size="small"
                          variant="outlined"
                          required
                          inputProps={{ min: 0 }}
                          sx={inputStyles}
                        />
                      </TableCell>
                      {/* VDS Total */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <TextField
                          label="VDS Total"
                          name="vds_total"
                          type="number"
                          value={poFormData.vds_total}
                          onChange={handlePoChange}
                          fullWidth
                          size="small"
                          variant="outlined"
                          inputProps={{ min: 0 }}
                          sx={inputStyles}
                        />
                      </TableCell>
                      {/* TDS Total */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <TextField
                          label="TDS Total"
                          name="tds_total"
                          type="number"
                          value={poFormData.tds_total}
                          onChange={handlePoChange}
                          fullWidth
                          size="small"
                          variant="outlined"
                          inputProps={{ min: 0 }}
                          sx={inputStyles}
                        />
                      </TableCell>
                      {/* Company Code */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          borderRight: "1px solid #e5e7eb",
                          mt: 1,
                        }}
                      >
                        <TextField
                          label="Company Code"
                          name="company_code"
                          value={poFormData.company_code}
                          onChange={handlePoChange}
                          fullWidth
                          size="small"
                          variant="outlined"
                          sx={inputStyles}
                        />
                      </TableCell>
                      {/* Parent PO */}
                      <TableCell
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          p: { xs: 0.5, sm: 1 },
                          mt: 1,
                        }}
                      >
                        <FormControl fullWidth size="small">
                          <InputLabel
                            sx={{
                              fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              color: "#6b7280",
                              "&.Mui-focused": { color: "#6366f1" },
                            }}
                          >
                            Select Parent PO
                          </InputLabel>
                          <Select
                            name="po_id"
                            value={poFormData.po_id}
                            onChange={handlePoChange}
                            sx={selectStyles}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  maxHeight: 300,
                                  "& .MuiMenuItem-root": {
                                    fontSize: "0.875rem",
                                    whiteSpace: "normal",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  },
                                },
                              },
                            }}
                          >
                            <MenuItem value="">None</MenuItem>
                            {purchaseOrders.map((po) => (
                              <MenuItem key={po.id} value={po.id.toString()}>
                                {po.po_no}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Section 2: Purchase Order Items */}
            <Paper
              sx={{
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                p: { xs: 2, sm: 4 },
                mb: 4,
                bgcolor: "white",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                  pb: 1,
                  borderBottom: "2px solid #e5e7eb",
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "1.5rem", sm: "1.75rem" },
                    fontWeight: 700,
                    color: "#1f2937",
                    textAlign: "left",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  Purchase Order Items
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={addItem}
                  sx={{
                    bgcolor: "linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)",
                    color: "white",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    fontWeight: 600,
                    borderRadius: "8px",
                    textTransform: "none",
                    px: { xs: 2, sm: 3 },
                    py: 1,
                    "&:hover": {
                      bgcolor: "linear-gradient(90deg, #4f46e5 0%, #4338ca 100%)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    },
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  Add Item
                </Button>
              </Box>
              <TableContainer sx={{ maxWidth: "100%", overflowX: "auto", borderRadius: "8px", mt: 2 }}>
                <Table sx={{ minWidth: 2000 }}>
                  <TableHead>
                    <TableRow>
                      {[
                        "Line",
                        "Product *",
                        "Quantity *",
                        "Unit Price *",
                        "Discount",
                        "Discount %",
                        "Total Price *",
                        "VDS %",
                        "VDS",
                        "TDS %",
                        "TDS",
                        "Purchase Order",
                        "Actions",
                      ].map((header, index) => (
                        <TableCell
                          key={header}
                          sx={{
                            bgcolor: "#e5e7eb",
                            fontWeight: 700,
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            p: { xs: 1, sm: 1.5 },
                            borderRight: index < 12 ? "1px solid #d1d5db" : "none",
                            color: "#1f2937",
                            minWidth: index === 1 || index === 11 ? 250 : 120,
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {updatedItems.map((item, index) => (
                      <TableRow
                        key={index}
                        sx={{
                          "&:hover": { bgcolor: "#f3f4f6" },
                          bgcolor: index % 2 === 0 ? "white" : "#fafafa",
                        }}
                      >
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            p: { xs: 0.5, sm: 1 },
                            borderRight: "1px solid #e5e7eb",
                            mt: 1,
                          }}
                        >
                          <TextField
                            label="Line"
                            name="line_no"
                            value={item.line_no}
                            onChange={(e) => handleItemChange(index, "line_no", e.target.value)}
                            fullWidth
                            size="small"
                            variant="outlined"
                            sx={inputStyles}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            p: { xs: 0.5, sm: 1 },
                            borderRight: "1px solid #e5e7eb",
                            mt: 1,
                          }}
                        >
                          <FormControl fullWidth size="small">
                            <InputLabel
                              sx={{
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                                color: "#6b7280",
                                "&.Mui-focused": { color: "#6366f1" },
                                "&::after": { content: '"*"', ml: 0.25 },
                              }}
                            >
                              Select Product
                            </InputLabel>
                            <Select
                              value={item.inv_product_id}
                              onChange={(e) =>
                                handleItemChange(index, "inv_product_id", e.target.value)
                              }
                              sx={{
                                ...selectStyles,
                                maxWidth: "350px",
                              }}
                              MenuProps={{
                                PaperProps: {
                                  sx: {
                                    maxHeight: 300,
                                    "& .MuiMenuItem-root": {
                                      fontSize: "0.875rem",
                                      whiteSpace: "normal",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    },
                                  },
                                },
                              }}
                            >
                              <MenuItem value="">Select Product</MenuItem>
                              {products.map((product) => (
                                <MenuItem key={product.id} value={product.id.toString()}>
                                  {product.name} ({product.code})
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            p: { xs: 0.5, sm: 1 },
                            borderRight: "1px solid #e5e7eb",
                            mt: 1,
                          }}
                        >
                          <TextField
                            label="Quantity"
                            name="quantity"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                            fullWidth
                            size="small"
                            variant="outlined"
                            required
                            inputProps={{ min: 0 }}
                            sx={inputStyles}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            p: { xs: 0.5, sm: 1 },
                            borderRight: "1px solid #e5e7eb",
                            mt: 1,
                          }}
                        >
                          <TextField
                            label="Unit Price"
                            name="unit_price"
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                            fullWidth
                            size="small"
                            variant="outlined"
                            required
                            inputProps={{ min: 0 }}
                            sx={inputStyles}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            p: { xs: 0.5, sm: 1 },
                            borderRight: "1px solid #e5e7eb",
                            mt: 1,
                          }}
                        >
                          <TextField
                            label="Discount"
                            name="discount"
                            type="number"
                            value={item.discount}
                            onChange={(e) => handleItemChange(index, "discount", e.target.value)}
                            fullWidth
                            size="small"
                            variant="outlined"
                            inputProps={{ min: 0 }}
                            sx={inputStyles}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            p: { xs: 0.5, sm: 1 },
                            borderRight: "1px solid #e5e7eb",
                            bgcolor: "#f9fafb",
                            mt: 1,
                          }}
                        >
                          <TextField
                            label="Discount %"
                            name="discount_pct"
                            type="number"
                            value={item.discount_pct}
                            onChange={(e) => handleItemChange(index, "discount_pct", e.target.value)}
                            fullWidth
                            size="small"
                            variant="outlined"
                            inputProps={{ min: 0, max: 100 }}
                            sx={inputStyles}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            p: { xs: 0.5, sm: 1 },
                            borderRight: "1px solid #e5e7eb",
                            bgcolor: "#f9fafb",
                            mt: 1,
                          }}
                        >
                          <TextField
                            label="Total Price"
                            name="total_price"
                            type="number"
                            value={item.total_price}
                            onChange={(e) => handleItemChange(index, "total_price", e.target.value)}
                            fullWidth
                            size="small"
                            variant="outlined"
                            required
                            inputProps={{ min: 0 }}
                            sx={inputStyles}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            p: { xs: 0.5, sm: 1 },
                            borderRight: "1px solid #e5e7eb",
                            mt: 1,
                          }}
                        >
                          <TextField
                            label="VDS %"
                            name="vds_pct"
                            type="number"
                            value={item.vds_pct}
                            onChange={(e) => handleItemChange(index, "vds_pct", e.target.value)}
                            fullWidth
                            size="small"
                            variant="outlined"
                            inputProps={{ min: 0 }}
                            sx={inputStyles}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            p: { xs: 0.5, sm: 1 },
                            borderRight: "1px solid #e5e7eb",
                            bgcolor: "#f9fafb",
                            mt: 1,
                          }}
                        >
                          <TextField
                            label="VDS"
                            name="vds"
                            type="number"
                            value={item.vds}
                            onChange={(e) => handleItemChange(index, "vds", e.target.value)}
                            fullWidth
                            size="small"
                            variant="outlined"
                            inputProps={{ min: 0 }}
                            sx={inputStyles}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            p: { xs: 0.5, sm: 1 },
                            borderRight: "1px solid #e5e7eb",
                            mt: 1,
                          }}
                        >
                          <TextField
                            label="TDS %"
                            name="tds_pct"
                            type="number"
                            value={item.tds_pct}
                            onChange={(e) => handleItemChange(index, "tds_pct", e.target.value)}
                            fullWidth
                            size="small"
                            variant="outlined"
                            inputProps={{ min: 0 }}
                            sx={inputStyles}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            p: { xs: 0.5, sm: 1 },
                            borderRight: "1px solid #e5e7eb",
                            bgcolor: "#f9fafb",
                            mt: 1,
                          }}
                        >
                          <TextField
                            label="TDS"
                            name="tds"
                            type="number"
                            value={item.tds}
                            onChange={(e) => handleItemChange(index, "tds", e.target.value)}
                            fullWidth
                            size="small"
                            variant="outlined"
                            inputProps={{ min: 0 }}
                            sx={inputStyles}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            p: { xs: 0.5, sm: 1 },
                            borderRight: "1px solid #e5e7eb",
                            mt: 1,
                          }}
                        >
                          <FormControl fullWidth size="small">
                            <InputLabel
                              sx={{
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                                color: "#6b7280",
                                "&.Mui-focused": { color: "#6366f1" },
                                "&::after": { content: '"*"', ml: 0.25 },
                              }}
                            >
                              Select PO
                            </InputLabel>
                            <Select
                              value={item.po_id}
                              onChange={(e) => handleItemChange(index, "po_id", e.target.value)}
                              sx={{
                                ...selectStyles,
                                maxWidth: "350px",
                              }}
                              MenuProps={{
                                PaperProps: {
                                  sx: {
                                    maxHeight: 300,
                                    "& .MuiMenuItem-root": {
                                      fontSize: "0.875rem",
                                      whiteSpace: "normal",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    },
                                  },
                                },
                              }}
                            >
                              <MenuItem value="">Select PO</MenuItem>
                              {purchaseOrders.map((po) => (
                                <MenuItem key={po.id} value={po.id.toString()}>
                                  {po.po_no}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            p: { xs: 0.5, sm: 1 },
                            mt: 1,
                          }}
                        >
                          <IconButton
                            onClick={() => deleteItem(index)}
                            sx={{
                              color: "#6b7280",
                              "&:hover": { color: "#ef4444", bgcolor: "#fef2f2" },
                              borderRadius: "6px",
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Submit Section */}
            <Paper
              sx={{
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                p: { xs: 2, sm: 3 },
                bgcolor: "white",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                <Button
                  onClick={() => {
                    setPoFormData({
                      po_no: "",
                      po_date: "",
                      po_type: "",
                      pay_mode: "",
                      discount: "",
                      sub_total: "",
                      grand_total: "",
                      vds_total: "",
                      tds_total: "",
                      vendor_id: "",
                      store_id: "",
                      currency: "BDT",
                      subject: "",
                      remarks: "",
                      company_code: "",
                      created_by: userId ? userId.toString() : "",
                      modified_by: userId ? userId.toString() : "",
                      po_id: "",
                    });
                    setItemsFormData([
                      {
                        line_no: "1",
                        inv_product_id: "",
                        quantity: "",
                        unit_price: "",
                        discount: "",
                        discount_pct: "",
                        total_price: "",
                        vds_pct: "",
                        vds: "",
                        tds_pct: "",
                        tds: "",
                        po_id: "",
                        manual_total_price: false,
                        manual_vds: false,
                        manual_tds: false,
                      },
                    ]);
                  }}
                  sx={{
                    bgcolor: "#e5e7eb",
                    color: "#1f2937",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    fontWeight: 600,
                    borderRadius: "8px",
                    textTransform: "none",
                    px: { xs: 2, sm: 3 },
                    py: 1,
                    "&:hover": {
                      bgcolor: "#d1d5db",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    },
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={!isFormValid() || loading}
                  sx={{
                    bgcolor: "linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)",
                    color: "white",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    fontWeight: 600,
                    borderRadius: "8px",
                    textTransform: "none",
                    px: { xs: 2, sm: 3 },
                    py: 1,
                    "&:hover": {
                      bgcolor: "linear-gradient(90deg, #4f46e5 0%, #4338ca 100%)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    },
                    "&.Mui-disabled": {
                      bgcolor: "#d1d5db",
                      color: "#9ca3af",
                    },
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Submit Purchase Order"
                  )}
                </Button>
              </Box>
            </Paper>
          </>
        )}
      </Box>
    </Sidebar>
  );
};

export default CreatePurchaseOrder;