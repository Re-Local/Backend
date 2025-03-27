
// First C program
#define _CRT_SECURE_ NO_WARNINGS
#include <stdio.h>  


int main()
{
	int a,b;
	scanf_s("%d", &a);
	printf("Current year: %d \n", a);
	scanf_s("%d", &b);
	printf("The year you were born: %d \n", b);
	return 0;
}