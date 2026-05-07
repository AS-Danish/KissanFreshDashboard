import React, { forwardRef } from 'react';

export const InvoiceTemplate = forwardRef(({ order, userName }, ref) => {
    if (!order) return null;

    const totalDiscount = (order.discount || 0) + (order.couponDiscount || 0);

    return (
        <div ref={ref} className="bg-white p-10 font-sans text-slate-800" style={{ width: '210mm', minHeight: '297mm' }}>
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-200 pb-8 mb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">KISSAN FRESH</h1>
                    <p className="text-sm text-slate-500 mt-2 font-medium">Farm to Home Freshness</p>
                    <div className="mt-4 text-sm text-slate-600 space-y-1">
                        <p>123 Agri Business Park</p>
                        <p>Sector 62, Noida, UP 201309</p>
                        <p>Phone: +91 98765 43210</p>
                        <p>Email: support@kissanfresh.com</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-bold text-slate-300 uppercase tracking-widest mb-4">Invoice</h2>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <span className="text-slate-500 font-semibold">Invoice No:</span>
                        <span className="font-bold text-slate-900">{order.orderNumber}</span>
                        
                        <span className="text-slate-500 font-semibold">Date:</span>
                        <span className="font-bold text-slate-900">{new Date(order.orderDate).toLocaleDateString()}</span>
                        
                        <span className="text-slate-500 font-semibold">Payment:</span>
                        <span className="font-bold text-slate-900">{(order.orderType || order.paymentMethod)?.toUpperCase() === 'COD' || (order.orderType || order.paymentMethod)?.toUpperCase() === 'CASH' ? 'Cash on Delivery' : 'Online'}</span>
                    </div>
                </div>
            </div>

            {/* Bill To */}
            <div className="mb-10 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h3 className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-3">Bill To</h3>
                <p className="text-lg font-bold text-slate-900">{userName || 'Guest User'}</p>
                <p className="text-sm text-slate-600 mt-1 max-w-sm leading-relaxed">{order.deliveryAddress}</p>
            </div>

            {/* Items Table */}
            <table className="w-full text-left border-collapse mb-10">
                <thead>
                    <tr className="border-b-2 border-slate-900">
                        <th className="py-4 px-2 text-xs font-bold uppercase tracking-wider text-slate-500">Item Description</th>
                        <th className="py-4 px-2 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Qty</th>
                        <th className="py-4 px-2 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Unit Price</th>
                        <th className="py-4 px-2 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {order.items?.map((item, index) => (
                        <tr key={index}>
                            <td className="py-4 px-2">
                                <p className="font-bold text-sm text-slate-900">{item.title}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">#{item.productId?.substring(0, 8).toUpperCase()}</p>
                            </td>
                            <td className="py-4 px-2 text-sm text-center font-semibold text-slate-700">{item.quantity}</td>
                            <td className="py-4 px-2 text-sm text-right text-slate-600">₹{item.price.toFixed(2)}</td>
                            <td className="py-4 px-2 text-sm text-right font-bold text-slate-900">₹{(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
                <div className="w-1/2 min-w-[250px]">
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center text-slate-600">
                            <span>Subtotal</span>
                            <span className="font-semibold text-slate-900">₹{order.subtotal?.toFixed(2) || "0.00"}</span>
                        </div>
                        {order.deliveryFee > 0 && (
                            <div className="flex justify-between items-center text-slate-600">
                                <span>Delivery Fee</span>
                                <span className="font-semibold text-slate-900">₹{order.deliveryFee.toFixed(2)}</span>
                            </div>
                        )}
                        {totalDiscount > 0 && (
                            <div className="flex justify-between items-center text-green-600">
                                <span>Discount</span>
                                <span className="font-semibold">-₹{totalDiscount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="border-t-2 border-slate-900 pt-3 mt-3 flex justify-between items-center">
                            <span className="text-base font-bold text-slate-900 uppercase">Total Amount</span>
                            <span className="text-xl font-black text-slate-900">₹{order.totalAmount?.toFixed(2) || "0.00"}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-20 pt-8 border-t border-slate-200 text-center">
                <p className="text-lg font-bold text-slate-800">Thank you for your business!</p>
                <p className="text-sm text-slate-500 mt-2">If you have any questions about this invoice, please contact our support team.</p>
            </div>
        </div>
    );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';
