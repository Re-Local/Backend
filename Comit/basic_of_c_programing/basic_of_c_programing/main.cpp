#define _CRT_SECURE_NO_WARNINGS
#include <stdio.h>


int main() {

	int n, m;
	scanf("%d", &n);

	for (m = 2; m < n; m++) {
		if (n % m == 0) {
			printf("%d is not a prime number \n", n);
			return 0;

		}
	}

	printf("%d is a prime number \n", n);
	return 0;
}
