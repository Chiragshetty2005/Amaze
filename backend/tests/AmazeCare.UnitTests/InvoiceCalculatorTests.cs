using AmazeCare.Application.Common;

namespace AmazeCare.UnitTests;

public sealed class InvoiceCalculatorTests
{
    [Fact]
    public void Calculate_RoundsTaxToTheNearestRupee()
    {
        var totals = InvoiceCalculator.Calculate([1200m, 300m, 650m]);

        Assert.Equal(2150m, totals.Subtotal);
        Assert.Equal(108m, totals.TaxAmount);
        Assert.Equal(2258m, totals.TotalAmount);
    }

    [Fact]
    public void Calculate_HandlesAnEmptyInvoice()
    {
        var totals = InvoiceCalculator.Calculate([]);

        Assert.Equal(0m, totals.Subtotal);
        Assert.Equal(0m, totals.TaxAmount);
        Assert.Equal(0m, totals.TotalAmount);
    }

    [Fact]
    public void Calculate_RejectsAnInvalidTaxRate()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            InvoiceCalculator.Calculate([100m], 1.5m));
    }
}
