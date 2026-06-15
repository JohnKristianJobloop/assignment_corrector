using Xunit;

// Kjent testfil. Deltakeren skal definere en type Person med egenskapene
// Name (string) og Age (int), og implementere kontrakten:
//   public static class Solution
//   {
//       public static Person MakePerson(string name, int age);
//       public static bool   IsAdult(Person person);
//       public static Person Birthday(Person person);
//   }
// Innsendingen skrives til Submission.cs og kompileres sammen med denne fila.
public class ObjectTests
{
    [Fact]
    public void MakePerson_sets_the_fields()
    {
        var p = Solution.MakePerson("Ada", 30);
        Assert.Equal("Ada", p.Name);
        Assert.Equal(30, p.Age);
    }

    [Fact]
    public void IsAdult_uses_18_as_the_boundary()
    {
        Assert.True(Solution.IsAdult(Solution.MakePerson("Ada", 18)));
        Assert.False(Solution.IsAdult(Solution.MakePerson("Bo", 17)));
    }

    [Fact]
    public void Birthday_returns_a_new_person_without_mutating()
    {
        var p = Solution.MakePerson("Ada", 30);
        var older = Solution.Birthday(p);

        Assert.Equal(31, older.Age);
        Assert.Equal("Ada", older.Name);
        Assert.Equal(30, p.Age);
    }
}
