public record Person(string Name, int Age);

public static class Solution
{
    public static Person MakePerson(string name, int age) => new Person(name, age);

    public static bool IsAdult(Person person) => person.Age >= 18;

    public static Person Birthday(Person person) => person with { Age = person.Age + 1 };
}
