// NDJSON-harness for C#-innsendinger. Kjøres som EGEN prosess (`dotnet run`) av
// CSharpRunner. Oppdager alle parameterløse [Fact]-metoder i assemblyet (dvs.
// oppgavens Tests.cs, kompilert sammen med deltakerens Submission.cs), kjører
// hver enkelt og streamer ÉN NDJSON-linje per assertion til stdout etter hvert
// som testene fullføres. Parent-prosessen filtrerer ut linjer som starter med
// "{" og mapper dem til protokollens TestResult/Report.
//
// Bruker xUnit sine egne assertions (Assert.*); vi reflekterer kun for å drive
// kjøringen og fange unntak. Assertion-feil (Xunit.Sdk.*Exception) gir
// expected/actual; andre unntak rapporteres som error.
using System;
using System.Diagnostics;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using Xunit;

var asm = Assembly.GetExecutingAssembly();

var tests = asm.GetTypes()
    .Where(t => t.IsClass && !t.IsAbstract)
    .SelectMany(t => t.GetMethods(
        BindingFlags.Public | BindingFlags.Instance | BindingFlags.Static))
    .Where(m => m.GetParameters().Length == 0
                && m.GetCustomAttributes().Any(a => a is FactAttribute))
    .OrderBy(m => m.DeclaringType!.Name)
    .ThenBy(m => m.MetadataToken)
    .ToList();

int passed = 0, failed = 0;

foreach (var m in tests)
{
    var name = m.Name;
    var sw = Stopwatch.StartNew();
    try
    {
        object? instance = m.IsStatic
            ? null
            : Activator.CreateInstance(m.DeclaringType!);
        var ret = m.Invoke(instance, null);
        if (ret is System.Threading.Tasks.Task task) task.GetAwaiter().GetResult();
        sw.Stop();
        passed++;
        Emit(new { kind = "result", name, status = "pass", durationMs = sw.Elapsed.TotalMilliseconds });
    }
    catch (Exception ex)
    {
        sw.Stop();
        failed++;
        var err = (ex as TargetInvocationException)?.InnerException ?? ex;
        var ns = err.GetType().Namespace ?? "";
        var (expected, actual) = ParseExpectedActual(err.Message);

        if (ns.StartsWith("Xunit") && (expected is not null || actual is not null))
        {
            Emit(new
            {
                kind = "result",
                name,
                status = "fail",
                failKind = "assertion",
                message = FirstLine(err.Message),
                expected = expected ?? "",
                actual = actual ?? "",
                durationMs = sw.Elapsed.TotalMilliseconds,
            });
        }
        else
        {
            Emit(new
            {
                kind = "result",
                name,
                status = "fail",
                failKind = "error",
                message = ns.StartsWith("Xunit")
                    ? err.Message
                    : $"{err.GetType().Name}: {err.Message}",
                durationMs = sw.Elapsed.TotalMilliseconds,
            });
        }
    }
}

int total = passed + failed;
Emit(new { kind = "summary", passed, failed, total, correct = failed == 0 && total > 0 });
return 0;

static void Emit(object o) => Console.WriteLine(JsonSerializer.Serialize(o));

static string FirstLine(string s)
{
    var i = s.IndexOf('\n');
    return (i >= 0 ? s[..i] : s).TrimEnd('\r');
}

// xUnit-assertion-meldinger har formen "... Expected: <e> ... Actual: <a> ...".
// Vi plukker ut de to linjene; finner vi dem ikke, behandles feilen som error.
static (string?, string?) ParseExpectedActual(string msg)
{
    string? expected = null, actual = null;
    foreach (var raw in msg.Split('\n'))
    {
        var line = raw.TrimEnd('\r').TrimStart();
        if (expected is null && line.StartsWith("Expected:"))
            expected = line["Expected:".Length..].Trim();
        else if (actual is null && line.StartsWith("Actual:"))
            actual = line["Actual:".Length..].Trim();
    }
    return (expected, actual);
}
