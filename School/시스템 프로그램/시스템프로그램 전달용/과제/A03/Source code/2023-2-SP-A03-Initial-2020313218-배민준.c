#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define BUCKET 500

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

void sort_list(List *);
List* merge_list(List *, List *);

void print_info(List **);
int print_list(List *, int);

void extract_bigram(char *, char *, char *);
void parse_bigram(FILE *, List **);
Bigram* init_bigram(char *, char *);

int search_bigram(List *, char *, char *);

int hash(char *, char *);

void lower1(char*);
void lower2(char*);


// ---------------------------------------------------------------
// -+-+-+- [ Function Declaration Related to Linked List ] -+-+-+-
// ---------------------------------------------------------------

void list_init(List* plist);
void append_2_head(List* plist, Bigram* pdata);

int set_first(List* plist);
int next_node(List* plist);

// Bigram* remove_curnode(List *plist);
int data_free(Bigram* bigram);
int clear_list(List* plist);

int count_node(List* plist);

Node* pop_node(List* plist, int idx);
void insert_node(List* plist, Node* insert_node, int idx);
int check_node_freq(List* plist, int idx);


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
    List *merged_list = bucket[0];
    for(int i = 1; i < BUCKET; i++) {
        merged_list = merge_list(merged_list, bucket[i]);
    }

    // Do insertion sort & print info
    sort_list(merged_list);
    print_list(merged_list, 1);

    // Clear all resources
    fclose(file);
    clear_list(merged_list);

    // Program running time check
    clock_t end = clock();
    printf("\n---------------------\n");
    printf("Running time: %.3lfs\n", (double)(end - start) / CLOCKS_PER_SEC);
    printf("---------------------\n");
    return 0;
}

// ---------------------------------------
// -+-+-+- [ Function Definition ] -+-+-+-
// ---------------------------------------

void sort_list(List *merged_list) {
    int i, j;
    Node *key_node = NULL;
    int standard = 0;
    int cmp = 0;

    for(i = 1; i < merged_list->num_of_data; i++){
        key_node = pop_node(merged_list, i);
        standard = key_node->bigram->freq;

        for( j = i - 1; j >= 0; j--){
            cmp = check_node_freq(merged_list, j);
            if (standard < cmp) {
                break;
            }
        }

        insert_node(merged_list, key_node, j + 1);
    }
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

void print_info(List **bucket) {
    int prinited_num = 1;
    for(int i = 0; i < BUCKET; i++) {
        prinited_num = print_list(bucket[i], prinited_num);
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

        lower1(buffer);

        while (1) {
            // Extract bigram
            extract_bigram(buffer, fword, bword);
            if (bword[0] == '\0') {
                break;
            }

            hash_idx = hash(fword, bword);
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

int hash(char *fword, char *bword) {
    int ascii_sum = 0;
    char ch = fword[0];

    for (int i = 1; ch != '\0'; i++) {
        ascii_sum += ch;
        ch = fword[i];
    }

    ch = bword[0];
    for (int i = 1; ch != '\0'; i++) {
        ascii_sum+= ch;
        ch = bword[i];
    }

    return (ascii_sum % BUCKET);
}


void lower1(char *s) {
    long i;

    for (i = 0; i < strlen(s); i++) {
        if (s[i] >= 'A' && s[i] <= 'Z') {
            s[i] -= ('A' - 'a');
        }
    }
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
    if (plist->cur->next == plist->tail) {
        return 0;
    } else {
        plist->cur = plist->cur->next;
        return 1;
    }
}


// This function don't used.

/*
Bigram* remove_curnode(List *plist) {
    Node *temp = plist->cur;
    Bigram *temp_data = plist->cur->bigram;

    Node *temp_next = temp->next;

    plist->cur = plist->before;
    plist->cur->next = temp->next;

    data_free(temp->bigram);
    free(temp);
    plist->num_of_data--;

    return temp_data;
}
*/

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

int count_node(List* plist) {
    return plist->num_of_data;
}

Node* pop_node(List* plist, int idx) {
    Node* pop_node = NULL;
    set_first(plist);

    for (int i = 0; i < idx; i++) {
        next_node(plist);
    }

    pop_node = plist->cur;

    plist->cur->before->next = pop_node->next;
    plist->cur->next->before = pop_node->before;

    plist->cur = pop_node->before;

    return pop_node;
}

void insert_node(List* plist, Node* insert_node, int idx) {
    set_first(plist);

    for (int i = 0; i < idx; i++) {
        next_node(plist);
    }

    insert_node->before = plist->cur->before;
    plist->cur->before->next = insert_node;

    insert_node->next = plist->cur;
    plist->cur->before = insert_node;
}

int check_node_freq(List* plist, int idx) {
    int freq = 0;
    set_first(plist);

    for (int i = 0; i < idx; i++) {
        next_node(plist);
    }

    freq = plist->cur->bigram->freq;
    return freq;
}
