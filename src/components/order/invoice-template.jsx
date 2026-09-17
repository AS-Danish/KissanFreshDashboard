import { forwardRef } from 'react';

export const InvoiceTemplate = forwardRef(({ order, userName }, ref) => {
    if (!order) return null;

    const totalDiscount = (order.discount || 0) + (order.couponDiscount || 0);
    const isCod = (order.orderType || order.paymentMethod)?.toUpperCase() === 'COD' || (order.orderType || order.paymentMethod)?.toUpperCase() === 'CASH';
    const dateFormat = new Date(order.orderDate).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });

    const paymentText = isCod ? 'CASH ON DELIVERY' : 'ONLINE PAYMENT';
    const paymentBg = isCod ? 'bg-green-50' : 'bg-teal-50';
    const paymentBorder = isCod ? 'border-green-200' : 'border-teal-200';
    const paymentTextCol = isCod ? 'text-green-800' : 'text-teal-800';

    return (
        <div ref={ref} className="bg-white p-10 font-sans text-slate-800" style={{ width: '210mm', minHeight: '297mm' }}>
            {/* Header & Branding */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-teal-800">Kissan Fresh</h1>
                    <p className="text-sm font-bold text-slate-700 mt-1">Tax Invoice / Bill of Supply</p>
                    <p className="text-xs text-slate-600 mt-1">FSSAI Lic. No. 21525044001001</p>
                </div>
                <div>
                    <div className={`px-3 py-1.5 border rounded-md ${paymentBg} ${paymentBorder}`}>
                        <span className={`text-xs font-bold ${paymentTextCol}`}>{paymentText}</span>
                    </div>
                </div>
            </div>

            <hr className="border-t border-dashed border-slate-400 mb-4" />

            {/* Order & Delivery Info */}
            <div className="grid grid-cols-2 gap-8 mb-4 text-sm">
                <div className="space-y-3">
                    <div>
                        <p className="text-slate-500 text-xs">Order ID</p>
                        <p className="font-semibold text-slate-800">{order.orderNumber}</p>
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs">Order Date</p>
                        <p className="font-semibold text-slate-800">{dateFormat}</p>
                    </div>
                    {order.paymentId && (
                        <div>
                            <p className="text-slate-500 text-xs">Transaction ID</p>
                            <p className="font-semibold text-slate-800">{order.paymentId}</p>
                        </div>
                    )}
                </div>
                <div className="space-y-3">
                    <div>
                        <p className="text-slate-500 text-xs">Delivery Address</p>
                        <p className="font-semibold text-slate-800 break-words">{order.deliveryAddress}</p>
                        <p className="text-xs text-slate-600 mt-1">Billed To: {userName || 'Guest User'}</p>
                    </div>
                </div>
            </div>

            <hr className="border-t border-dashed border-slate-400 mb-5" />

            {/* Order Summary Title */}
            <h2 className="text-base font-bold text-slate-800 mb-3">Order Summary</h2>

            {/* Items Table */}
            <table className="w-full text-left border-collapse mb-8 text-sm">
                <thead>
                    <tr className="border-b border-slate-300">
                        <th className="py-2 text-slate-700 font-bold w-12">SN</th>
                        <th className="py-2 text-slate-700 font-bold">Item Name</th>
                        <th className="py-2 text-slate-700 font-bold text-right w-16">Qty</th>
                        <th className="py-2 text-slate-700 font-bold text-right w-24">Price</th>
                        <th className="py-2 text-slate-700 font-bold text-right w-24">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 border-b border-slate-300">
                    {order.items?.map((item, index) => (
                        <tr key={index}>
                            <td className="py-3 text-slate-700">{index + 1}</td>
                            <td className="py-3">
                                <p className="font-medium text-slate-800">{item.title}</p>
                            </td>
                            <td className="py-3 text-right font-medium text-slate-700">{item.quantity}</td>
                            <td className="py-3 text-right text-slate-700">Rs.{item.price.toFixed(2)}</td>
                            <td className="py-3 text-right font-medium text-slate-700">Rs.{(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals Section */}
            <div className="flex justify-end mb-8">
                <div className="w-1/2 bg-slate-50 rounded-lg border border-slate-200 p-4">
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-slate-600">
                            <span>Item Total</span>
                            <span className="font-medium text-slate-800">Rs.{order.subtotal?.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                            <span>Handling Fee</span>
                            <span className="font-medium text-slate-800">Rs.0.00</span>
                        </div>
                        
                        {order.deliveryFee > 0 ? (
                            <div className="flex justify-between text-slate-600">
                                <span>Delivery Partner Fee</span>
                                <span className="font-medium text-slate-800">Rs.{order.deliveryFee.toFixed(2)}</span>
                            </div>
                        ) : (
                            <div className="flex justify-between text-green-600">
                                <span>Delivery Partner Fee</span>
                                <span className="font-medium">FREE</span>
                            </div>
                        )}
                        
                        {(order.discount || 0) > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Item Discount</span>
                                <span className="font-medium">-Rs.{(order.discount || 0).toFixed(2)}</span>
                            </div>
                        )}
                        
                        {(order.couponDiscount || 0) > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Coupon Savings</span>
                                <span className="font-medium">-Rs.{(order.couponDiscount || 0).toFixed(2)}</span>
                            </div>
                        )}
                        
                        <hr className="border-t border-dashed border-slate-400 my-2" />
                        
                        <div className="flex justify-between items-center mt-2 mb-2">
                            <span className="text-base font-bold text-slate-800">Grand Total</span>
                            <span className="text-lg font-bold text-teal-800">Rs.{order.totalAmount?.toFixed(2) || "0.00"}</span>
                        </div>

                        {(order.walletAppliedPaise || 0) > 0 && (
                            <div className="flex justify-between text-indigo-700 font-medium">
                                <span>Paid via Kissan Wallet</span>
                                <span>-Rs.{((order.walletAppliedPaise || 0) / 100).toFixed(2)}</span>
                            </div>
                        )}

                        {(order.walletAppliedPaise || 0) > 0 && (
                            <div className="flex justify-between items-center text-slate-800 font-bold pt-1 border-t border-slate-200">
                                <span>Amount Paid via {order.orderType || 'Online'}</span>
                                <span>Rs.{Math.max(0, (order.totalAmount || 0) - ((order.walletAppliedPaise || 0) / 100)).toFixed(2)}</span>
                            </div>
                        )}

                        {(order.debugAdjustedAmountPaise || 0) > 0 && (
                            <div className="flex justify-between text-emerald-700 font-medium bg-emerald-50 p-1.5 rounded mt-2">
                                <span>Returned to Wallet</span>
                                <span>Rs.{((order.debugAdjustedAmountPaise || 0) / 100).toFixed(2)}</span>
                            </div>
                        )}
                        
                        {totalDiscount > 0 && (
                            <div className="bg-green-50 px-2 py-1.5 rounded text-center border border-green-100 mt-2">
                                <span className="text-xs font-bold text-green-800">Your total savings: Rs.{totalDiscount.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-grow"></div>

            {/* Footer */}
            <div className="mt-auto pt-6 border-t border-slate-300">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h4 className="text-xs font-bold text-slate-800 mb-1">Terms & Conditions</h4>
                        <p className="text-[10px] text-slate-600">1. Goods once sold cannot be returned unless defective.</p>
                        <p className="text-[10px] text-slate-600">2. For any queries, reach out to our support team.</p>
                    </div>
                    <div className="text-right">
                        <h4 className="text-xs font-bold text-slate-800 mb-1">Need Help?</h4>
                        <p className="text-[11px] text-teal-700 font-medium">support@kissanfresh.com</p>
                        <p className="text-[11px] text-teal-700 font-medium">+91 98765 43210</p>
                    </div>
                </div>
                <div className="text-center pb-2">
                    <p className="text-xs font-bold text-slate-600">Thank you for shopping with Kissan Fresh!</p>
                </div>
            </div>
        </div>
    );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';

