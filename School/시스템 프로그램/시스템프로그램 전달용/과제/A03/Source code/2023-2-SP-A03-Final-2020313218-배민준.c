#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <inttypes.h>
#include <time.h>

#define BUCKET 100003

// ---------------------------------------
// -+-+- [ Linked List Definition ] +-+-+-
// ---------------------------------------

typedef struct __BigramData {
    char* fword;
    char* bword;
    int   freq;
} Bigram;

typedef struct _node {
    Bigram* bigram;
    struct _node* next;
    struct _node* before;
} Node;

typedef struct _likedList {
    Node* head;
    Node* cur;
    Node* tail;
    int num_of_data;
} List;


// ---------------------------------------
// -+-+-+- [ Function Declaration ] +-+-+-
// ---------------------------------------

void sort_quick(int, Node *, Node *, Node *);
void swap_node(Node *, Node *);
List* merge_list(List *, List *);

void print_info(List **);
int print_list(List *, int);

void extract_bigram(char *, char *, char *);
void parse_bigram(FILE *, List **);
Bigram* init_bigram(char *, char *);

int search_bigram(List *, char *, char *);

int improved_hash(char *, char *);

void lower2(char*);


// ---------------------------------------------------------------
// -+-+-+- [ Function Declaration Related to Linked List ] -+-+-+-
// ---------------------------------------------------------------

void list_init(List*);
void append_2_head(List*, Bigram*);

int set_first(List*);
int next_node(List*);

int data_free(Bigram*);
int clear_list(List*);


// ---------------------------------------
// -+-+-+--+-+- [ Main Code ] -+-+-+--+-+-
// ---------------------------------------

int main(int argv, char** argc) {
    clock_t start = clock();
    char *filename = NULL;
    if (argv > 1) {
        filename = argc[1];
    } else {
        filename = "shakespeare.txt";
        //filename = "test.txt";
    }

    FILE *file = fopen(filename, "r");
    if (file == NULL) {
        printf("[ERROR] File \"%s\" is invalid.\n", filename);
    }

    // Make Bucket
    List *bucket[BUCKET]  = { 0 };
    for (int i = 0; i < BUCKET; i++) {
        bucket[i] = (List *)malloc(sizeof(List));
        list_init(bucket[i]);
    }

    printf("\n-----------------------------\n");
    printf("[INFO] Mining Bigrams...\n");
    printf("-----------------------------\n");

    // Extract bigram from the text file and renew the bucket
    parse_bigram(file, bucket);

    // Merge all list that seperated to hash map(bucket)
    List *merged_list = NULL;
    List *acc1 = bucket[0];
    List *acc2 = bucket[1];
    List *acc3 = bucket[2];
    int index = 0;
    for(index = 3; index < BUCKET - 2; index += 3) {
        acc1 = merge_list(acc1, bucket[index]);
        acc2 = merge_list(acc2, bucket[index + 1]);
        acc3 = merge_list(acc3, bucket[index + 2]);
    }

    for(; index < BUCKET; index++) {
        acc1 = merge_list(acc1, bucket[index]);
    }

    merged_list = merge_list(acc1, acc2);
    merged_list = merge_list(merged_list, acc3);

    // Do insertion sort & print info
    sort_quick(merged_list->num_of_data, merged_list->head->next,
               merged_list->tail->before, merged_list->head);
    print_list(merged_list, 1);

    // Clear all resources
    fclose(file);
    clear_list(merged_list);

    // Program running time check
    clock_t end = clock();
    printf("\n----------------------------\n");
    printf("Running time: %.3lfms (%.3lfs)\n",
           ((double)(end - start) / CLOCKS_PER_SEC) * 1000, (double)(end - start) / CLOCKS_PER_SEC);
    printf("----------------------------\n");
    return 0;
}


// ---------------------------------------
// -+-+-+- [ Function Definition ] -+-+-+-
// ---------------------------------------

void sort_quick(int num, Node *Left, Node *Right, Node *dummy_head) {
	int nhigh = 1;
	int nTotal = num;
	int nlow = nTotal-1;

	// Terminate the recursive function if there is one node to sort
	if (nlow <= nhigh)
        return;

	Node *Key_node = Right;
	Node *left_node = Left;
	Node *right_node = Right->before;

	while (1) {
        // Explore left partition until there is a value less than
        // the frequency of the key_node
		while ( left_node->bigram->freq > Key_node->bigram->freq) {
			left_node = left_node->next;
			nhigh++;
		}

        // Explore left partition until there is a value greater than
        // the frequency of the key_node
		while (right_node->bigram != NULL && right_node->bigram->freq < Key_node->bigram->freq) {
			if(nlow <= 1 || right_node -> before == dummy_head)
				break;
			right_node = right_node->before;
			nlow--;
		}

		// Terminate condition of while loop
		if (nhigh >= nlow)
			break;

        // Swap the nodes discovered in the two while loops above
		swap_node(left_node, right_node);

		left_node = left_node->next;
		nhigh++;
		right_node = right_node->before;
		nlow--;
	}

    // Swap key_node and left_node(nhigh)
	swap_node(Key_node, left_node);

	// Recursive function call to left partition
	sort_quick(nhigh - 1, Left, left_node->before, dummy_head);

	// Recursive function call to right partition
	sort_quick(nTotal - nhigh, left_node->next, Right, dummy_head);
}


void swap_node(Node *node1, Node *node2) {
    Bigram *tmp = node1->bigram;
    
    node1->bigram = node2->bigram;
    node2->bigram = tmp;
}


List* merge_list(List *plist1, List *plist2) {
    plist1->tail->before->next = plist2->head->next;
    plist2->head->next->before = plist1->tail->before;

    // Free dummy tail of plist1
    free(plist1->tail);
    // Free dummy head of plist2
    free(plist2->head);

    plist1->num_of_data += plist2->num_of_data;
    plist1->tail = plist2->tail;

    // Merge two list at plist1 and return
    return plist1;
}


// Print function for bucket distribution test
void print_info(List **bucket) {
    int prinited_num = 1;
    for(int i = 0; i < BUCKET; i++) {
        // prinited_num = print_list(bucket[i], prinited_num);
        printf("[BUCKET %d] : %d\n", i, bucket[i]->num_of_data);
    }
}


int print_list(List *plist, int start) {
    set_first(plist);
    int idx = start;

    for (int i = 0; i < plist->num_of_data; i++) {
        printf("\n-+-+-+-[%d] Bigram-+-+-+-\n", idx);
        printf("Front word : %s\n", plist->cur->bigram->fword);
        printf("Back word  : %s\n", plist->cur->bigram->bword);
        printf("Frequency  : %d\n", plist->cur->bigram->freq);
        printf("---------------------------\n");
        next_node(plist);
        idx++;
    }

    return idx;
}


void parse_bigram(FILE *file, List **bucket) {
    char fword[20] = { 0 };
    char bword[20] = { 0 } ;
    int hash_idx = 0;
    int dup_flag = 0;

    char buffer[3000] = {0};
    char *fp = NULL;

    while (fp = fgets(buffer, 3000, file)) {
        if (buffer[0] == '\n') {
            continue;
        }

        lower2(buffer);

        while (1) {
            // Extract bigram
            extract_bigram(buffer, fword, bword);
            if (bword[0] == '\0') {
                break;
            }

            hash_idx = improved_hash(fword, bword);
            dup_flag = search_bigram(bucket[hash_idx], fword, bword);
            if (dup_flag == -1) {
                Bigram *bigram = init_bigram(fword, bword);
                append_2_head(bucket[hash_idx], bigram);
            }
        }
    }
}


void extract_bigram(char *buffer, char *fword, char *bword) {
    static char *g_address = NULL;
    int offset = 0;
    int n = 0;
    int __trash_n = 0;
    char __trash[20] = { 0 };

    if (g_address == NULL) {
        g_address = buffer;
    }

    if (fword[0] == '\0') {
        // CASE 1) First time that extract bigram from text file
        sscanf(g_address, "%[^\n\r,; !.:?_'\"-]%n", fword, &n);
        offset += n;

        n = 0;
        sscanf(g_address + offset, "%[\n\r,; !.:?_'\"-]%[^\n\r,; !.:?_'\"-]%n", __trash, bword, &n);
        offset += n;

    } else if (fword[0] != '\0' && bword[0] != '\0') {
        // CASE 2) Extracting line is updated
        strcpy(fword, bword);
        sscanf(g_address, "%[\n\r,; !.:?_'\"-]%n", __trash, &__trash_n);
        offset += __trash_n;

        sscanf(g_address + offset, "%[^\n\r,; !.:?_'\"-]%n", bword, &n);

        if (__trash[__trash_n - 1] == '\n') {
            strcpy(bword, "");
            g_address = NULL;
            return;
        }
        offset += n;
    } else if (fword[0] != '\0' && bword[0] == '\0') {
        // CASE 3) Extraction is performed on a specific line
        sscanf(g_address, "%[\n\r,; !.:?_'\"-]%n", __trash, &__trash_n);
        offset += __trash_n;

        sscanf(g_address + offset, "%[^\n\r,; !.:?_'\"-]%n", bword, &n);
        offset += n;
    }

    g_address = g_address + offset;
    return;
}


Bigram* init_bigram(char *fword, char *bword) {
    Bigram *bigr = (Bigram *)malloc(sizeof(Bigram));

    bigr->fword = (char*)malloc(sizeof(char) * strlen(fword));
    strcpy(bigr->fword, fword);

    bigr->bword = (char*)malloc(sizeof(char) * strlen(bword));
    strcpy(bigr->bword, bword);

    bigr->freq = 1;

    return bigr;
}


int search_bigram(List *plist, char *fword, char *bword) {
    set_first(plist);
    int idx = 0;

    for (; idx < plist->num_of_data; idx++) {
        if (!strcmp(plist->cur->bigram->fword, fword) && !strcmp(plist->cur->bigram->bword, bword)) {
            plist->cur->bigram->freq++;
            break;
        }
        next_node(plist);
    }

    if (idx == plist->num_of_data) {
        idx = -1;
    }

    return idx;
}


int improved_hash(char *fword, char *bword) {
    uint64_t hash = 0;

    int len_fword = strlen(fword);
    int len_bword = strlen(bword);

    uint64_t xmul = 1;

    for (int i = len_bword - 1; i >= 0; i--) {
        hash += bword[i] * xmul;
        xmul *= 31;
    }

    for (int i = len_fword - 1; i >= 0; i--) {
        hash += fword[i] * xmul;
        xmul *= 31;
    }

    return (hash % BUCKET);
}


void lower2(char *s) {
    long i;
    long len = strlen(s);

    for (i = 0; i < len; i++) {
        if (s[i] >= 'A' && s[i] <= 'Z') {
            s[i] -= ('A' - 'a') ;
        }
    }
}


// ---------------------------------------------------------------
// -+-+-+- [ Function Definition Related to Linked List  ] -+-+-+-
// ---------------------------------------------------------------

void list_init(List* plist) {
    plist->head = (Node*)malloc(sizeof(Node));
    plist->tail = (Node*)malloc(sizeof(Node));

    plist->head->bigram = NULL;
    plist->tail->bigram = NULL;

    plist->head->next = plist->tail;
    plist->tail->next = NULL;

    plist->head->before = NULL;
    plist->tail->before = plist->head;

    plist->cur = plist->head;

    plist->num_of_data = 0;
}


void append_2_head(List* plist, Bigram* pbigram) {
    Node* newnode = (Node*)malloc(sizeof(Node));
    newnode->bigram = pbigram;

    newnode->next = plist->head->next;
    newnode->next->before = newnode;

    newnode->before = plist->head;
    plist->head->next = newnode;

    plist->num_of_data++;
}


int set_first(List* plist) {
    if (plist->head->next == plist->tail) {
        return 0;
    } else {
        plist->cur = plist->head->next;
        return 1;
    }
}


int next_node(List* plist) {
    if ( plist->cur->next == plist->tail) {
        return 0;
    } else {
        plist->cur = plist->cur->next;
        return 1;
    }
}


int data_free(Bigram* bigram) {
    free(bigram->fword);
    free(bigram->bword);
    free(bigram);
}

int clear_list(List* plist) {
    Node* del_node = plist->head->next;
    Node* next_del = NULL;
    Node* tail_node = plist->tail;

    while (del_node != tail_node) {
        next_del = del_node->next;
        data_free(del_node->bigram);
        free(del_node);

        del_node = next_del;
    }

    free(plist->head);
    free(plist->tail);
    free(plist);
}
