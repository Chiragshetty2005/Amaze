namespace AmazeCare.Application.Common;

public sealed record InvoiceTotals(decimal Subtotal, decimal TaxAmount, decimal TotalAmount);

public static class InvoiceCalculator
{
    public const decimal DefaultTaxRate = 0.05m;

    public static InvoiceTotals Calculate(IEnumerable<decimal> amounts, decimal taxRate = DefaultTaxRate)
    {
        if (taxRate < 0 || taxRate > 1)
        {
            throw new ArgumentOutOfRangeException(nameof(taxRate), "Tax rate must be between 0 and 1.");
        }

        var subtotal = amounts.Sum();
        var tax = Math.Round(subtotal * taxRate, 0, MidpointRounding.AwayFromZero);
        return new InvoiceTotals(subtotal, tax, subtotal + tax);
    }
}
